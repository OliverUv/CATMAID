from django.conf import settings
from django.core.paginator import Paginator, EmptyPage, InvalidPage
from django.core.urlresolvers import reverse
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import get_object_or_404
from vncbrowser.models import CELL_BODY_CHOICES, \
    ClassInstanceClassInstance, Relation, Class, ClassInstance, \
    Project, User, Treenode, Connector, TreenodeConnector
from vncbrowser.views import catmaid_login_required, my_render_to_response, \
    get_form_and_neurons
import json
import re
import sys
try:
    import numpy as np
    import h5py
except ImportError:
    pass
from contextlib import closing
from random import choice

@catmaid_login_required
def index(request, **kwargs):
    all_neurons, search_form = get_form_and_neurons(request,
                                                    kwargs['project_id'],
                                                    kwargs)
    return my_render_to_response(request,
                                 'vncbrowser/index.html',
                                 {'all_neurons_list': all_neurons,
                                  'project_id': kwargs['project_id'],
                                  'catmaid_url': settings.CATMAID_URL,
                                  'user': kwargs['logged_in_user'],
                                  'search_form': search_form})

@catmaid_login_required
def visual_index(request, **kwargs):

    all_neurons, search_form = get_form_and_neurons( request,
                                                     kwargs['project_id'],
                                                     kwargs )

    # From: http://docs.djangoproject.com/en/1.0/topics/pagination/
    paginator = Paginator(all_neurons, 20)
    if 'page' in kwargs:
        page = kwargs['page'] or 1
    else:
        try:
            page = int(request.GET.get('page', '1'))
        except ValueError:
            page = 1

    # If page request (9999) is out of range, deliver last page of results.
    try:
        neurons = paginator.page(page)
    except (EmptyPage, InvalidPage):
        neurons = paginator.page(paginator.num_pages)

    return my_render_to_response(request,
                                 'vncbrowser/visual_index.html',
                                 {'sorted_neurons': neurons.object_list,
                                  'sorted_neurons_page' : neurons,
                                  'project_id': kwargs['project_id'],
                                  'catmaid_url': settings.CATMAID_URL,
                                  'user': kwargs['logged_in_user'],
                                  'search_form': search_form })

@catmaid_login_required
def view(request, project_id=None, neuron_id=None, neuron_name=None, logged_in_user=None):
    p = get_object_or_404(Project, pk=project_id)
    # FIXME: add the class name as well
    if neuron_id:
        n = get_object_or_404(ClassInstance, pk=neuron_id, project=project_id)
    else:
        n = get_object_or_404(ClassInstance, name=neuron_name, project=project_id)

    lines = ClassInstance.objects.filter(
        project=p,
        cici_via_a__class_instance_b=n,
        cici_via_a__relation__relation_name='expresses_in').all()

    outgoing = n.all_neurons_downstream(project_id)
    incoming = n.all_neurons_upstream(project_id)

    outgoing = [x for x in outgoing if not re.match('orphaned (pre|post)$', x['name'])]
    incoming = [x for x in incoming if not re.match('orphaned (pre|post)$', x['name'])]

    skeletons = ClassInstance.objects.filter(
        project=p,
        cici_via_a__relation__relation_name='model_of',
        class_column__class_name='skeleton',
        cici_via_a__class_instance_b=n)

    return my_render_to_response(request,
                                 'vncbrowser/view.html',
                                 {'neuron': n,
                                  'lines': lines,
                                  'skeletons': skeletons,
                                  'project_id': project_id,
                                  'catmaid_url': settings.CATMAID_URL,
                                  'user': logged_in_user,
                                  'cell_body_choices': CELL_BODY_CHOICES,
                                  'incoming': incoming,
                                  'outgoing': outgoing} )

@catmaid_login_required
def set_cell_body(request, logged_in_user=None):
    neuron_id = request.POST['neuron_id']
    n = get_object_or_404(ClassInstance, pk=neuron_id)
    new_location_code = request.POST['cell-body-choice']
    choices_dict = dict(CELL_BODY_CHOICES)
    if new_location_code not in choices_dict:
        raise Exception, "Unknown cell body location: "+str(new_location_code)
    new_location = choices_dict[new_location_code]
    n.set_cell_body_location(new_location)
    return HttpResponseRedirect(reverse('vncbrowser.views.view',
                                        kwargs={'neuron_id':neuron_id,
                                                'project_id':n.project.id}))

@catmaid_login_required
def line(request, project_id=None, line_id=None, logged_in_user=None):
    p = get_object_or_404(Project, pk=project_id)
    l = get_object_or_404(ClassInstance, pk=line_id, project=p, class_column__class_name='driver_line')
    sorted_neurons = ClassInstance.objects.filter(
        cici_via_b__relation__relation_name='expresses_in',
        cici_via_b__class_instance_a=l).order_by('name')
    return my_render_to_response(request,
                                 'vncbrowser/line.html',
                                 {'line': l,
                                  'project_id': p.id,
                                  'catmaid_url': settings.CATMAID_URL,
                                  'user': logged_in_user,
                                  'neurons': sorted_neurons})

@catmaid_login_required
def lines_add(request, project_id=None, logged_in_user=None):
    p = Project.objects.get(pk=project_id)
    # FIXME: for the moment, just hardcode the user ID:
    user = User.objects.get(pk=3)
    neuron = get_object_or_404(ClassInstance,
                               pk=request.POST['neuron_id'],
                               project=p)

    # There's a race condition here, if two people try to add a line
    # with the same name at the same time.  The normal way to deal
    # with this would be to make the `name` column unique in the
    # table, but since the class_instance table isn't just for driver
    # lines, we can't do that.  (FIXME)
    try:
        line = ClassInstance.objects.get(name=request.POST['line_name'])
    except ClassInstance.DoesNotExist:
        line = ClassInstance()
        line.name=request.POST['line_name']
        line.project = p
        line.user = user
        line.class_column = Class.objects.get(class_name='driver_line', project=p)
        line.save()

    r = Relation.objects.get(relation_name='expresses_in', project=p)

    cici = ClassInstanceClassInstance()
    cici.class_instance_a = line
    cici.class_instance_b = neuron
    cici.relation = r
    cici.user = user
    cici.project = p
    cici.save()

    return HttpResponseRedirect(reverse('vncbrowser.views.view',
                                        kwargs={'neuron_id':neuron.id,
                                                'project_id':p.id}))

@catmaid_login_required
def lines_delete(request, project_id=None, logged_in_user=None):
    p = Project.objects.get(pk=project_id)
    neuron = get_object_or_404(ClassInstance,
                               pk=request.POST['neuron_id'],
                               project=p)

    r = Relation.objects.get(relation_name='expresses_in', project=p)

    ClassInstanceClassInstance.objects.filter(relation=r,
                                              project=p,
                                              class_instance_a__name=request.POST['line_name'],
                                              class_instance_b=neuron).delete()
    return HttpResponseRedirect(reverse('vncbrowser.views.view',
                                        kwargs={'neuron_id':neuron.id,
                                                'project_id':p.id}))

def get_skeleton_as_neurohdf(project_id=None, skeleton_id=None):
    # retrieve all treenodes for a given skeleton
    qs = Treenode.objects.filter(
        treenodeclassinstance__class_instance__id=skeleton_id,
        treenodeclassinstance__relation__relation_name='element_of',
        treenodeclassinstance__class_instance__class_column__class_name='skeleton',
        project=project_id).order_by('id')

    treenode_count = qs.count()
    treenode_xyz = np.zeros( (treenode_count, 3), dtype = np.float32 )
    treenode_parentid = np.zeros( (treenode_count,), dtype = np.uint32 )
    treenode_id = np.zeros( (treenode_count,), dtype = np.uint32 )
    treenode_radius = np.zeros( (treenode_count,), dtype = np.uint32 )
    treenode_confidence = np.zeros( (treenode_count,), dtype = np.uint32 )
    treenode_userid = np.zeros( (treenode_count,), dtype = np.uint32 )
    treenode_type = np.zeros( (treenode_count,), dtype = np.uint32 )
    for i,tn in enumerate(qs):
        treenode_xyz[i,0] = tn.location.x
        treenode_xyz[i,1] = tn.location.y
        treenode_xyz[i,2] = tn.location.z
        if not tn.parent_id is None:
            treenode_parentid[i] = tn.parent_id
            treenode_type[i] = 4 # TODO: skeleton node
        else:
            treenode_type[i] = 5 # TODO: skeleton root node
            parentrow = i
        treenode_id[i] = tn.id
        treenode_radius[i] = tn.radius
        treenode_confidence[i] = tn.confidence
        treenode_userid[i] = tn.user_id

    # Get id-based connectivity
    treenode_connectivity = np.zeros( (treenode_count-1, 2), dtype = np.uint32 )
    treenode_connectivity_type = np.zeros( (treenode_count,), dtype = np.uint32 )
    row_count = 0
    for i in range(treenode_count):
        treenode_connectivity_type[i] = 1 # TODO: neurite
        if i == parentrow:
            continue
        treenode_connectivity[row_count,0] = treenode_id[i]
        treenode_connectivity[row_count,1] = treenode_parentid[i]
        row_count += 1

    qs_tc = TreenodeConnector.objects.filter(
        treenode__treenodeclassinstance__class_instance__id=skeleton_id,
        treenode__treenodeclassinstance__relation__relation_name='element_of',
        treenode__treenodeclassinstance__class_instance__class_column__class_name='skeleton',
        project=project_id,
        relation__relation_name__endswith = 'synaptic_to',
        treenode__in=list(treenode_id)
    ).select_related('treenode', 'connector', 'relation')

    treenode_connector_connectivity=[]; treenode_connector_connectivity_type=[]
    cn_type=[]; cn_xyz=[]; cn_id=[]; cn_confidence=[]; cn_userid=[]; cn_radius=[]

    for tc in qs_tc:
        if tc.relation.relation_name == 'presynaptic_to':
            treenode_connector_connectivity_type.append( 2 ) # TODO: presynaptic type id
        elif tc.relation.relation_name == 'postsynaptic_to':
            treenode_connector_connectivity_type.append( 3 ) # TODO: presynaptic type id
        else:
            print >> std.err, "non-synaptic relation found: ", tc.relation.relation_name
            continue
        treenode_connector_connectivity.append( [tc.treenode.id,tc.connector.id] )
        # also need other connector node information
        cn_xyz.append( [tc.connector.location.x, tc.connector.location.y, tc.connector.location.z] )
        cn_id.append( tc.connector.id )
        cn_confidence.append( tc.connector.confidence )
        cn_userid.append( tc.connector.user_id )
        cn_radius.append( 0 ) # default because no radius for connector
        cn_type.append( 2 ) # TODO: connector node

    # concatenate treenode and treenode_connector information and store all into neurohdf
    fname = ''.join([choice('abcdefghijklmnopqrstuvwxyz0123456789(-_=+)') for i in range(50)])

    # TODO: should be a static path
    neurohdf_filename = '/tmp/%s.h5' % fname

    with closing(h5py.File(neurohdf_filename, 'a')) as hfile:
        mcgroup = hfile.create_group("Microcircuit")
        vert = mcgroup.create_group("vertices")
        vertproperties = vert.create_group("properties")
        conn = vert.create_group("connectivity")
        connproperties = conn.create_group("properties")

        vert.create_dataset("id", data=np.hstack((treenode_id.T, np.array(cn_id, dtype=np.uint32))))
        vertproperties.create_dataset("location", data=np.vstack((treenode_xyz, np.array(cn_xyz, dtype=np.uint32))))
        vertproperties.create_dataset("type", data=np.hstack((treenode_type.T, np.array(cn_type, dtype=np.uint32))))
        vertproperties.create_dataset("confidence", data=np.hstack((treenode_confidence.T, np.array(cn_confidence, dtype=np.uint32))))
        vertproperties.create_dataset("userid", data=np.hstack((treenode_userid.T, np.array(cn_userid, dtype=np.uint32))))
        vertproperties.create_dataset("radius", data=np.hstack((treenode_radius.T, np.array(cn_radius, dtype=np.uint32))))
        
        conn.create_dataset("id", data=np.vstack((treenode_connectivity, np.array(treenode_connector_connectivity, dtype=np.uint32))))
        connproperties.create_dataset("type", data=np.hstack((treenode_connectivity_type.T, np.array(treenode_connector_connectivity_type, dtype=np.uint32))))
        # TODO: add metadata fields!
        # connproperties["type"].attrs["content_value_1_name"] = "presynaptic"
        # content_type = "categorial
        # content_value = [0, 1, 2, 3]
        # content_name = ["blab", "blubb", ...]

    return neurohdf_filename


@catmaid_login_required
def skeleton_neurohdf(request, project_id=None, skeleton_id=None, logged_in_user=None):
    """ Generate the NeuroHDF on the local file system with a long hash
    that is sent back to the user and which can be used (not-logged in) to
    retrieve the file from the not-listed static folder
    """
    neurohdf_filename=get_skeleton_as_neurohdf(project_id, skeleton_id)
    return HttpResponse(neurohdf_filename, mimetype="text/plain")

@catmaid_login_required
def groupnode_neurohdf(request, project_id=None, group_id=None, logged_in_user=None):
    """ Generate a NeuroHDF file with the microcircuit using all skeleton leaf-nodes
    starting from a given group id of the annotation domain.
    """
    pass
    # TODO: fetch all skeleton ids and retrieve arrays and merge into one hdf5 with
    # optimization not duplicating connector nodes. special treatment for retrieving everything
    # setting skeleton_id as connectivity property to group

@catmaid_login_required
def skeleton_swc(request, project_id=None, skeleton_id=None, treenode_id=None, logged_in_user=None):
    if treenode_id and not skeleton_id:
        ci = ClassInstance.objects.get(
            project=project_id,
            class_column__class_name='skeleton',
            treenodeclassinstance__relation__relation_name='element_of',
            treenodeclassinstance__treenode__id=treenode_id)
        skeleton_id = ci.id
    qs = Treenode.objects.filter(
        treenodeclassinstance__class_instance__id=skeleton_id,
        treenodeclassinstance__relation__relation_name='element_of',
        treenodeclassinstance__class_instance__class_column__class_name='skeleton',
        project=project_id).order_by('id')
    all_rows = []
    for tn in qs:
        swc_row = [tn.id]
        swc_row.append(0)
        swc_row.append(tn.location.x)
        swc_row.append(tn.location.y)
        swc_row.append(tn.location.z)
        swc_row.append(max(tn.radius, 0))
        swc_row.append(-1 if tn.parent is None else tn.parent.id)
        all_rows.append(swc_row)
    result = ""
    for row in all_rows:
        result += " ".join(str(x) for x in row) + "\n"
    return HttpResponse(result, mimetype="text/plain")

@catmaid_login_required
def neuron_to_skeletons(request, project_id=None, neuron_id=None, logged_in_user=None):
    p = get_object_or_404(Project, pk=project_id)
    neuron = get_object_or_404(ClassInstance,
                               pk=neuron_id,
                               class_column__class_name='neuron',
                               project=p)
    qs = ClassInstance.objects.filter(
        project=p,
        cici_via_a__relation__relation_name='model_of',
        cici_via_a__class_instance_b=neuron)
    return HttpResponse(json.dumps([x.id for x in qs]), mimetype="text/json")

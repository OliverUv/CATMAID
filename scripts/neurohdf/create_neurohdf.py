#!/usr/bin/python

# Create a project and stack associated HDF5 file with additional
# data such as labels, meshes etc. 

import os.path as op
import h5py
from contextlib import closing
import numpy as np

project_id = 3
stack_id = 4
filepath = '/home/stephan/dev/CATMAID/django/hdf5'

with closing(h5py.File(op.join(filepath, '%s_%s.hdf' % (project_id, stack_id)), 'w')) as hfile:
    mesh=hfile.create_group('meshes')
    midline=mesh.create_group('midline')
    midline.create_dataset("vertices", data=np.array( [61200,  15200, 26750,63920,  26400, 76800, 66800,57600,76800, 69200,53120,26750] , dtype = np.float32 ) )
    # faces are coded according to the three.js JSONLoader standard.
    # See https://github.com/mrdoob/three.js/blob/master/src/extras/loaders/JSONLoader.js
    midline.create_dataset("faces", data=np.array( [0, 0, 1, 2,  0,2,3,0] , dtype = np.uint32 ) )

    image=hfile.create_group('myimage')
    scale=image.create_group('scale')
    scale0=scale.create_group('0')
    scale0.create_dataset('myimage', data=np.random.random_integers(0,255,
            (1024,1024,10)), dtype = np.uint8)
    

    # multi-scale image data in hdf5
    # myimage/ (type:multi_scale_image)
    #   scale/ (int:number_of_scales)
    #       0/
    #           irregular_dataset:mydataset
    #       1/
    #           irregular_dataset:mydataset
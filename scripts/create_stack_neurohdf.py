#!/usr/bin/python

# This scripts creates a HDF5 file that can be associated with
# a particular stack to store additional data

import os.path
import h5py
import numpy as np

storage_path='/home/stephan/dev/CATMAID/django/hdf5'
projectid=1
stackid=1
stack_dim_x,stack_dim_y,stack_dim_z=(2048,1536,10)
z_section_index=range(10)

fpath=os.path.join( storage_path, '1_1.hdf')
print fpath
hdfile=h5py.File( fpath, mode='w')

canvas=hdfile.create_group('channel').create_group('canvas')
section=canvas.create_group('section')
for z in z_section_index:
    mysection=section.create_group(str(z))
    mysection.create_dataset('data',
                             shape=(stack_dim_x,stack_dim_y),
                             dtype=np.uint32,
                             compression='lzf')

# access a section slice: ['/channel/canvas/section/5/data'].value
print hdfile['/channel/canvas/section/5/data'].value.shape

hdfile.close()
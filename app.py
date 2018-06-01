import os
import shutil
import tempfile
from flask import Flask, render_template, request, jsonify
from pysimm import system, forcefield, amber

app = Flask(__name__)
app.debug = True

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/get-types/', methods=['POST'])
def get_types():
    types = []
    desc = []
    molfile = request.form['mol']
    ff = request.form['ff']
    typer = request.form['typer']
    s = system.read_mol(molfile)
    try:
        if ff == 'Dreiding':
            f = forcefield.Dreiding()
            s.apply_forcefield(f)
        elif ff == 'Polymer Consistent Force Field (PCFF)':
            f = forcefield.Pcff()
            s.apply_forcefield(f)
        elif ff == 'Generalized Amber Force Field (GAFF)':
            f = forcefield.Gaff2()
            if typer == 'pysimm':
                s.apply_forcefield(f)
            elif typer == 'antechamber':
                cwd = os.getcwd()
                tempdir = tempfile.mkdtemp()
                print(tempdir)
                os.chdir(tempdir)
                amber.get_forcefield_types(s, f=f)
                os.chdir(cwd)
                shutil.rmtree(tempdir)
        types=[p.type.name for p in s.particles]
        desc=[p.type.desc for p in s.particles]
    except:
        print('error typing occurred')
    p_elems = set(p.elem for p in s.particles)
    possible_types = {e: [] for e in p_elems}
    possible_types_desc = {e: [] for e in p_elems}
    for pt in f.particle_types:
        if pt.elem in p_elems:
            possible_types[pt.elem].append(pt.name)
            possible_types_desc[pt.elem].append(pt.desc)
    
    return jsonify(types=types, desc=desc, possible_types=possible_types, possible_types_desc=possible_types_desc)

@app.route('/get-lmps/', methods=['POST'])
def get_lmps():
    molfile = request.form['mol']
    type_names = map(lambda x: x.split()[-1], request.form.getlist('typeNames[]'))
    ff = request.form['ff']
    if ff == 'Dreiding':
        f = forcefield.Dreiding()
    elif ff == 'Polymer Consistent Force Field (PCFF)':
        f = forcefield.Pcff()
    elif ff == 'Generalized Amber Force Field (GAFF)':
        f = forcefield.Gaff2()
    s = system.read_mol(molfile)
    types = {name: s.particle_types.add(f.particle_types.get(name)[0].copy()) for name in set(type_names)}
    for p, pname in zip(s.particles, type_names):
        p.type = types[pname]
    s.apply_forcefield(f, skip_ptypes=True)
    return jsonify(lmpsData=s.write_lammps('string'))
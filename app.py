from flask import Flask, render_template, request, jsonify
from pysimm import system, forcefield, amber

app = Flask(__name__)
app.debug = True

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/get-types/', methods=['POST'])
def get_types():
    molfile = request.form['mol']
    ff = request.form['ff']
    typer = request.form['typer']
    s = system.read_mol(molfile)
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
            amber.get_forcefield_types(s, f=f)
    
    return jsonify(types=[p.type.name for p in s.particles], desc=[p.type.desc for p in s.particles])

@app.route('/get-lmps/', methods=['POST'])
def get_lmps():
    molfile = request.form['mol']
    type_names = request.form.getlist('typeNames[]')
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
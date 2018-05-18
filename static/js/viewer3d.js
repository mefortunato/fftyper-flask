function download(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

var currentMolfile;
var currentMolecule;
var viewer;
var table;

$( document ).ready(function() {
    $('#loader-canvas').hide();
    $('#loader-table').hide();
    viewer = new ChemDoodle.TransformCanvas3D('editor3d', 500, 300);
    viewer.specs.set3DRepresentation('Ball and Stick');
    viewer.specs.backgroundColor = 'white';
    
    table = $('#table-atoms').DataTable();
    
    $('#table-atoms tbody')
        .on( 'mouseenter', 'td', function () {
            if (table.data().length == 0) return
            var rowIdx = table.cell(this).index().row;
            currentMolecule['atoms'][rowIdx].isSelected=true;
            viewer.repaint();
    } )
        .on( 'mouseleave', 'td', function () {
            if (table.data().length == 0) return
            var rowIdx = table.cell(this).index().row;
            currentMolecule['atoms'][rowIdx].isSelected=false;
            viewer.repaint();
    } );
    
    $('#forcefield').on('change', function(e) {
        var option = $('option:selected', this).val();
        if (option == 'Generalized Amber Force Field (GAFF)') {
            $('#typer-div').show();
        }
        else {
            $('#typer-div').hide();
        }
    })
    
    
    $('#form-typing').submit(function(event) {
        var struct = $('#input-structure').val();
        var ff = $('#forcefield').val();
        var typer = $('#typer').val();
        if (isNaN(Number(struct))) {
            var url = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/'+struct+'/SDF/?record_type=3d';
        }
        else {
            var url = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/'+struct+'/SDF/?record_type=3d';
        }
        $('#loader-canvas').show();
        var resp = jQuery.get(url, function(molfile) {
            currentMolfile = molfile;
            var mol = new ChemDoodle.io.MOLInterpreter().read(molfile, 1);
            currentMolecule = mol;
            viewer.loadMolecule(mol);
            viewer.repaint();
            $('#loader-table').show();
            $.post('/get-types/', {'mol': molfile, 'ff': ff, 'typer': typer}, function(respData) {
                var labels = mol.atoms.map(a => a.label);
                var data = new Array();
                for (i=1;i<=labels.length;i++) {
                    data.push(new Array(i, labels[i-1], respData['types'][i-1], respData['desc'][i-1]))
                }
                var table = $('#table-atoms').DataTable();
                table.data().clear();
                table.rows.add(data);
                table.draw()
            }).fail(function() {
                alert( "Error: Typing with pysimm failed." );
                var table = $('#table-atoms').DataTable();
                table.data().clear();
                table.draw();
            }).always(function() {
                $('#loader-table').hide();
            })
        }).fail(function() {
            alert( "Error: Communication with PubChem failed. Check input smiles or CID." );
            var table = $('#table-atoms').DataTable();
            table.data().clear();
            table.draw();
        }).always(function() {
            $('#loader-canvas').hide();
        });
        
        $('#input-structure').blur()
        event.preventDefault();
    });
    
    $('#download').click(function() {
        var typeNames = $('#table-atoms').DataTable().columns().data()[2];
        var ff = $('#forcefield').val();
        $.post('/get-lmps/', {'mol': currentMolfile, 'typeNames': typeNames, 'ff': ff}, function(respData) {
            download('data.lmps', respData['lmpsData'])
        });
    })
    
});

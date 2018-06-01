function download(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

var currentCid;
var currentMolfile;
var currentMolecule;
var viewer;
var table;
var possibleTypes;
var possibleTypesDesc;
var currentEdit;

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
    });
    
    $('#possible-types').change(function(event) {
        var typeName = $('#possible-types').val();
        for (e in possibleTypes) {
            for (i in possibleTypes[e]) {
                if (possibleTypes[e][i] == typeName) {
                    $('#type-desc').text(possibleTypesDesc[e][i]);
                }
            }
        }
    })
    
    $('#table-atoms tbody').on( 'click', 'tr td:nth-child(3)', function (){
        var tableData = table.row(this).data();
        currentEdit = tableData[0]-1;
        var elem = tableData[1];
        var tableData2 = tableData[2].split(" ");
        var typeName = tableData2[tableData2.length-1];
        $('#possible-types').empty();
        for (i in possibleTypes[elem]) {
            $('#possible-types').append('<option>'+possibleTypes[elem][i]+'</option>')
            if (typeName == possibleTypes[elem][i]) {
                $('#type-desc').text(possibleTypesDesc[elem][i])
            }
        }
        $('#possible-types').val(typeName);
    });
    
    $('#typeModal').on('hide.bs.modal', function(e) {
        table.cell(currentEdit, 2).data('<i class="fas fa-pencil-alt" data-toggle="modal" data-target="#typeModal"></i> '+$('#possible-types').val()).draw();
        table.cell(currentEdit, 3).data($('#type-desc').text()).draw();
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
            currentCid = molfile.split('\n').shift()
            var mol = new ChemDoodle.io.MOLInterpreter().read(molfile, 1);
            currentMolecule = mol;
            viewer.loadMolecule(mol);
            viewer.repaint();
            $('#loader-table').show();
            $.post('/get-types/', {'mol': molfile, 'ff': ff, 'typer': typer}, function(respData) {
                possibleTypesDesc = respData["possible_types_desc"];
                possibleTypes = respData["possible_types"];
                var labels = mol.atoms.map(a => a.label);
                var data = new Array();
                console.log(respData)
                if (respData['types'].length > 0) {
                    for (i=1;i<=labels.length;i++) {
                        data.push(new Array(i, labels[i-1], '<i class="fas fa-pencil-alt" data-toggle="modal" data-target="#typeModal"></i> '+respData['types'][i-1], respData['desc'][i-1]))
                    }
                }
                else {
                    alert('Error: Automatic typing failed. Please assign types manually')
                    for (i=1;i<=labels.length;i++) {
                        data.push(new Array(i, labels[i-1], '<i class="fas fa-pencil-alt" data-toggle="modal" data-target="#typeModal"></i> ', ''))
                    }
                }
                var table = $('#table-atoms').DataTable();
                table.data().clear();
                table.rows.add(data);
                table.draw()
            }).fail(function() {
                alert( "Error: Communication with pysimm api failed." );
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
        var ffstr = '';
        if (ff == 'Dreiding') {
            ffstr = 'dreiding';
        }
        else if (ff == 'Polymer Consistent Force Field (PCFF)') {
            ffstr = 'pcff';
        }
        else if (ff == 'Generalized Amber Force Field (GAFF)') {
            ffstr = 'gaff';
        }
        $.post('/get-lmps/', {'mol': currentMolfile, 'typeNames': typeNames, 'ff': ff}, function(respData) {
            if (respData['lmpsData'] == null) {
                alert('Error: typing with supplied atom types failed')
            }
            else {
                download(currentCid+'-'+ffstr+'.lmps', respData['lmpsData'])
            }
        });
    })
    
});

# Force Field Typing Flask App
----------------------------

### How to run development server

```
$ python app.py
```

### Deploy with gunicorn

```
$ gunicorn app:app
```

### Deploy with supervisor

* Install [supervisor](http://supervisord.org/index.html)
* Make sure /apps/fftyper-flask/logs/gunicorn exists
* Create /etc/supervisor/conf.d/fftyper.conf

```
[program:fftyper]
command = gunicorn app:app -b 0.0.0.0:8000
environment = PYTHONPATH=/apps/pysimm,PRODUCTION=1,ANTECHAMBER_EXEC=/apps/amber16/bin/antechamber,AMBERHOME=/apps/amber16
directory = /apps/fftyper-flask
user = colinaadmin
stdout_logfile = /apps/fftyper-flask/logs/gunicorn/gunicorn_stdout.log
stderr_logfile = /apps/fftyper-flask/logs/gunicorn/gunicorn_stderr.log
redirect_stderr = True
```

* Read conf file and update processes

```
$ sudo supervisorctl reread
$ sudo supervisorctl update
```

* Visit http://colinalab.chem.ufl.edu:8000
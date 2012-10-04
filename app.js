var app = require('http').createServer(handler)
  , io = require('socket.io').listen(app)
  , url = require('url')
  , fs = require('fs')
  , pg = require('pg')
  , qs = require('querystring')
  , ejs = require('ejs')
  , nodemailer = require("nodemailer")
  , path = require('path');

var port = process.env.PORT || 5000;

app.listen(port);

var transport = new nodemailer.Transport('SMTP', {
    host: 'smtp.mandrillapp.com',
    port: '587',
    auth: {
        user: 'jonathanmoreaufr+contakt@gmail.com',
        pass: 'fd1e08cf-6d57-4fee-af30-b9103c522e98'
    }
});

var conString = process.env.DATABASE_URL || 'tcp://postgres:death0wl@localhost:5432/contakt';
var meetingHTML = fs.readFileSync('views/meeting.ejs', 'utf8');
var mailHTML = fs.readFileSync('views/email.ejs', 'utf8');

// assuming io is the Socket.IO server object
io.configure(function () { 
  io.set("transports", ["xhr-polling"]); 
  io.set("polling duration", 10); 
});

//client.connect();

// RENDER function
function renderMeetingHTML(request, response, _meetings){
  response.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
  response.end(ejs.render(meetingHTML, { meetings: _meetings }));
}

function renderEmailError(request, response, json){
  response.writeHead(200, {'Content-Type': 'application/json'});
  response.end(JSON.stringify(json));
}
// END RENDER function


function handler(request, response) {
  var filePath = request.url;
  var extname = path.extname(filePath);

  console.log('extname '+extname);

  if(extname == '.js' || extname == '.css') {
    var contentType = '';
    switch (extname) {
      case '.js':
        console.log('js');
        contentType = 'text/javascript';
        break;
      case '.css':
        console.log('css');
        contentType = 'text/css';
        break;
    }
    
    path.exists('public'+filePath, function(exists) {
        if (exists) {
          console.log('public'+filePath+' exists');
            fs.readFile('public/'+filePath, function(error, content) {
                if (error) {
                    response.writeHead(500);
                    response.end();
                }
                else {
                  console.log(contentType);
                    response.writeHead(200, { 'Content-Type': contentType });
                    response.end(content, 'utf-8');
                }
            });
        }
        else {
            response.writeHead(404);
            response.end();
        }
    });
  }

  var pathname = url.parse(filePath).pathname;
  var meeting = pathname.split('/')[1];
  var sendMailRegex = new RegExp('^/'+meeting+'/send');
  var content = new Array;

  //console.log(meeting);
  //console.log(conString);

  // user try /meeting/send
  if(sendMailRegex.test(pathname))
  {
    // select * from meetings
    var query = client.query("SELECT * FROM meetings WHERE name = $1", [meeting]);
    query.on('row', function(row) {
      content.push(row);
    });
    query.on('end', function() {
      if(content.length == 0)
        return;

      // Send email
      nodemailer.sendMail({
        transport: transport,
        from: 'hello@contakt.io',
        to: 'jonathanmoreaufr',
        subject: 'Welcome Contakt.io',
        html: ejs.render(mailHTML, { meetings: content })
      }, function(error){
        if(error)
        {
          console.log(error);
        }
        else
        {
          console.log("Message sent!");
        }
        transport.close();
      });

      // redirect to meeting page
      response.writeHead(302, {'Location': '/'+meeting});
      response.end();
    }); 
  }
  else
  {
    // POST Action
    if (request.method == 'POST') {
      console.log("[200] " + request.method + " to " + request.url);

      var post = '';
        
      request.on('data', function(data) {
        post = data.toString();
        console.log('post '+post);
        
        // test if email enter is valid
        var emailPattern = new RegExp('[a-zA-Z][\w\.-]*[a-zA-Z0-9]@([a-zA-Z0-9][\w\.-]*[a-zA-Z0-9]\.[a-zA-Z][a-zA-Z\.]*[a-zA-Z])');
        if(emailPattern.test(qs.parse(data.toString()).email))
        {
          pg.connect(conString, function(err, client) {
            client.query("INSERT INTO meetings(name, email) values($1, $2)", [meeting, qs.parse(data.toString()).email]);
          });
          io.sockets.emit('meeting', { email: qs.parse(data.toString()).email });
        }
        else
        {
          var json = { error: { data: 'bad email address' } };
          renderEmailError(request, response, json);
        }
      });
      
      request.on('end', function() {
        console.log('end');
      });
    }
    // END POST ACTION

    pg.connect(conString, function(err, client) {
      // Query meeting + display all emails
      var query = client.query("SELECT * FROM meetings WHERE name = $1", [meeting]);
      query.on('row', function(row) {
        content.push(row);
      });
      query.on('end', function() {
        if(content.length == 0)
          content.push({name: meeting, email: 'hello@iterate.fr'});

        renderMeetingHTML(request, response, content);
      });
    });
    // END Query meeting + display all emails
  }

  
}

console.log('Server running at http://127.0.0.1:'+port);
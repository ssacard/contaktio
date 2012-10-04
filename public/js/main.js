!function ($) {

  $(function(){
    var socket = io.connect('http://contaktio.herokuapp.com/');
      socket.on('meeting', function (data) {
        console.log(data);
        $("ul").append('<li>'+data.email+'</li>');
      });


    $('#meetingForm').on('submit', function() {
      var email = $('#email').val();
      if(email == '') {
          alert('Les champs doivent êtres remplis');
      } else {
          $.ajax({
              url: $(this).attr('action'),
              type: $(this).attr('method'),
              data: $(this).serialize(),
              success: function(content){
                if(content.error != undefined)
                {
                  $('#msg').html(content.error.data);
                }
                else
                {
                  $('#msg').html('');
                }
              },
              error: function(error){
              }
          });
      }
      return false;
    });
  })
}(window.jQuery)
<?php

include_once( 'errors.inc.php' );
include_once( 'db.pg.class.php' );
include_once( 'session.class.php' );
include_once( 'tools.inc.php' );
include_once( 'json.inc.php' );

$db =& getDB();

if(isset($_POST['username']) &&
   isset($_POST['realname']) &&
   isset($_POST['password']) &&
   isset($_POST['password2'])) {

    if ($_POST['password'] !== $_POST['password2']) {
        ?>
        <p style="color: red">The passwords did not match.</p>
        <?
    } else if (strlen($_POST['password']) < 5) {
        ?>
        <p style="color: red">The password must be at least 5 characters long.</p>
        <?
    } else {
        $user_id = $db->insertIntoId('user',array('name' => $_POST['username'],
                                                'pwd' => md5($_POST['password']),
                                                'longname' => $_POST['realname']));
        if ($user_id) {
            if( ! $db->insertInto('project_user',array('user_id' => $user_id,
                                                       'project_id' => 3)) ) {

            ?>
            <p style="color: red">Linking your account with project 3 failed.</p>
            <?
            } else {
            ?>
            <p>Your account was created successfully - you can now <a href="<? echo dirname($_SERVER['PHP_SELF']); ?>/">log in.</a></p>
            <?
            }
        } else {
            ?>
            <p style="color: red">That username was already taken.</p>
            <?
        }

    }

} else if (isset($_POST['username']) ||
           isset($_POST['realname']) ||
           isset($_POST['password']) ||
           isset($_POST['password2'])) {

        ?>
        <p style="color: red">One of the required values was missing.</p>
        <?

} else {
    ?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
<html>
  <head>
    <meta http-equiv="content-type" content="text/html; charset=utf-8">
    <!-- <link rel="stylesheet" type="text/css" href="style.css" title="home"> -->
    <title>Register to use CATMAID</title>
  </head>
  <body>
   <h4>Create an account</h4>
   <form method="POST" action="<? echo $_SERVER['PHP_SELF'] ?>">
     <p>
       <label for="username">User name:</label> <input type="text" id="username" name="username"><br>
       <label for="realname">Full name:</label> <input type="text" id="realname" name="realname"><br>
       <label for="password">Password:</label> <input type="password" id="password" name="password"><br>
       <label for="password2">Confirm password:</label> <input type="password" id="password2" name="password2"><br>
       <input type="submit">
     </p>
   </form>

  </body>
</html>
    <?php
}
?>

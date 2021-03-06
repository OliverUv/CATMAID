<?php

/* */

include_once( 'errors.inc.php' );
include_once( 'db.pg.class.php' );
include_once( 'session.class.php' );
include_once( 'tools.inc.php' );
include_once( 'json.inc.php' );
include_once( 'utils.php' );

$db =& getDB();
$ses =& getSession();

$pid = isset( $_REQUEST[ 'pid' ] ) ? intval( $_REQUEST[ 'pid' ] ) : 0;
$uid = $ses->isSessionValid() ? $ses->getId() : 0;

# Check preconditions:

# 1. There must be a project id
if ( ! $pid ) {
  echo json_encode( array( 'error' => 'Project closed. Cannot apply operation.' ) );
	return;
}

# 2. There must be a user id
if ( ! $uid ) {
    echo json_encode( array( 'error' => 'You are not logged in.' ) );
	return;
}

checkPermissionsOrExit($db, $uid, $pid, $VIEW_ANY_ALLOWED);

$search_string = isset( $_REQUEST['substring'] ) ? $_REQUEST['substring'] : "";
$escaped_search_string = pg_escape_string($search_string);

$rows = $db->getResult(
  "SELECT ci.id, ci.name, c.class_name
   FROM class_instance ci inner join class c ON ci.class_id = c.id
   WHERE name ilike '%{$escaped_search_string}%'  AND ci.project_id = ".$pid." order by class_name, name");

# Retrieve nodes holding text labels
$labeled_as_id = null;
for ($i=0, $length = count($rows); $i<$length; $i++) {
  # Fetch necessary IDs
  if ('label' === $rows[$i]['class_name']) {
    $labeled_as_id = $db->getRelationId( $pid, 'labeled_as' );
    if (!$labeled_as_id) { echo makeJSON( array( 'error' => 'Can not find "labeled_as" relation for this project' ) ); return; }
    # Query for nodes holding the label
    $nodes = $db->getResult(
      'SELECT "treenode"."id",
              (treenode.location).x,
              (treenode.location).y, 
              (treenode.location).z,
              "treenode"."skeleton_id" AS "skid"
       FROM "treenode_class_instance" AS "tci",
            "class_instance",
            "treenode"
       WHERE treenode.project_id = '.$pid.'
         AND "treenode"."id" = "tci"."treenode_id"
         AND "tci"."relation_id" = '.$labeled_as_id.'
         AND "tci"."project_id" = '.$pid.'
         AND "tci"."class_instance_id" = "class_instance"."id"
         AND "class_instance"."name" = \''.$rows[$i]['name'].'\'
       ORDER BY "treenode"."id" DESC');
    if (count($nodes) > 0) {
      $rows[$i]['nodes'] = $nodes;
    }
  }
}

if ($rows === FALSE) {
    echo json_encode( array( 'error' => 'The search query failed.' ) );
    return;
}

echo json_encode($rows);

?>

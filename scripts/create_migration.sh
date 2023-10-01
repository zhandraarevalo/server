#!/bin/bash

var_create="create"
var_update="update"

timestamp=$(date +%Y%m%d%H%M%S)
fileName="$timestamp-$1-$2"
operation=""

if [[ $1 == $var_create ]]
then
  operation="\ncreate table if not exists $2 (\nid int not null auto_increment,\n\ncreated_at datetime not null default current_timestamp,\nupdated_at datetime not null default current_timestamp on update current_timestamp,\nprimary key (id)\n)\n"
elif [[ $1 == $var_update ]]
then
  fileName="$timestamp-$1-$2-$3"
  operation="update table $2"
else
  echo "invalid comand"
  exit 1
fi

touch "./api/migrations/$fileName.js"

echo -e "module.exports = \`$operation\`;" >> ./api/migrations/$fileName.js

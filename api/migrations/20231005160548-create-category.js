module.exports = `
  create table if not exists category (
    id int not null auto_increment,
    name varchar(255) not null,
    accumulates boolean not null,
    type varchar(255) not null,
    \`group\` int not null,
    created_at datetime not null default current_timestamp,
    updated_at datetime not null default current_timestamp on update current_timestamp,
    primary key (id),
    constraint fk_ctg_group foreign key (\`group\`) references \`group\`(id)
  )
`;

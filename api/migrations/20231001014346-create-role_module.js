module.exports = `
  create table if not exists role_module (
    id int not null auto_increment,
    role int not null,
    module int not null,
    created_at datetime not null default current_timestamp,
    updated_at datetime not null default current_timestamp on update current_timestamp,
    primary key (id),
    constraint fk_rm_role foreign key (role) references role(id),
    constraint fk_rm_module foreign key (module) references module(id)
  )
`;

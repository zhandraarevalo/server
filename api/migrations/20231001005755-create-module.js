module.exports = `
  create table if not exists module (
    id int not null auto_increment,
    sequence int not null,
    tag varchar(255) not null,
    icon varchar(255) not null,
    route varchar(255) not null,
    active boolean default true,
    created_at datetime not null default current_timestamp,
    updated_at datetime not null default current_timestamp on update current_timestamp,
    primary key (id)
  )
`;

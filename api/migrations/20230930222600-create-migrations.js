module.exports = `
  create table if not exists migrations(
    id int not null auto_increment,
    name varchar(255) unique not null,
    created_at datetime not null default current_timestamp,
    primary key (id)
  )
`;

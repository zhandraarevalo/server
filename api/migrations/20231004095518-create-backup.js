module.exports = `
  create table if not exists backup (
    id int not null auto_increment,
    date date not null,
    created_at datetime not null default current_timestamp,
    updated_at datetime not null default current_timestamp on update current_timestamp,
    primary key (id)
  )
`;

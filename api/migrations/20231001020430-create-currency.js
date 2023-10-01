module.exports = `
  create table if not exists currency (
    id int not null auto_increment,
    iso char(3) unique not null,
    country_iso char(2) unique not null,
    created_at datetime not null default current_timestamp,
    updated_at datetime not null default current_timestamp on update current_timestamp,
    primary key (id)
  )
`;

module.exports = `
  create table if not exists budget (
    id int not null auto_increment,
    amount int not null,
    category int not null,
    created_at datetime not null default current_timestamp,
    updated_at datetime not null default current_timestamp on update current_timestamp,
    primary key (id),
    constraint fk_bdg_category foreign key (category) references category(id)
  )
`;

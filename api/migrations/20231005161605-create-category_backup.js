module.exports = `
  create table if not exists category_backup (
    id int not null auto_increment,
    spent int not null,
    accumulated int,
    category int not null,
    backup int not null,
    created_at datetime not null default current_timestamp,
    updated_at datetime not null default current_timestamp on update current_timestamp,
    primary key (id),
    constraint fk_cb_category foreign key (category) references category(id),
    constraint fk_cb_backup foreign key (backup) references backup(id)
  )
`;

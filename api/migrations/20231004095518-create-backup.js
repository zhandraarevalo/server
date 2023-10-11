module.exports = `
  create table if not exists backup (
    id int not null auto_increment,
    date date not null,
    user int not null,
    created_at datetime not null default current_timestamp,
    updated_at datetime not null default current_timestamp on update current_timestamp,
    primary key (id),
    constraint fk_bck_user foreign key (user) references user(id)
  )
`;

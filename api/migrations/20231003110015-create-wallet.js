module.exports = `
  create table if not exists wallet (
    id int not null auto_increment,
    name varchar(255) not null,
    balance int default 0,
    type varchar(255) not null,
    account int not null,
    created_at datetime not null default current_timestamp,
    updated_at datetime not null default current_timestamp on update current_timestamp,
    primary key (id),
    constraint fk_wlt_account foreign key (account) references account(id)
  )
`;

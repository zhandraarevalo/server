module.exports = `
  create table if not exists account (
    id int not null auto_increment,
    name varchar(255) not null,
    currency int not null,
    created_at datetime not null default current_timestamp,
    updated_at datetime not null default current_timestamp on update current_timestamp,
    primary key (id),
    constraint fk_acc_account foreign key (currency) references user_currency(id)
  )
`;

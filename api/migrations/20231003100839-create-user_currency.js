module.exports = `
  create table if not exists user_currency (
    id int not null auto_increment,
    active boolean default true,
    main boolean default false,
    user int not null,
    currency int not null,
    created_at datetime not null default current_timestamp,
    updated_at datetime not null default current_timestamp on update current_timestamp,
    primary key (id),
    constraint fk_uc_user foreign key (user) references user(id),
    constraint fk_uc_currency foreign key (currency) references currency(id)
  )
`;

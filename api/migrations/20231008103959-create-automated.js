module.exports = `
  create table if not exists automated (
    id int not null auto_increment,
    day int not null,
    amount int not null,
    category int not null,
    wallet int not null,
    created_at datetime not null default current_timestamp,
    updated_at datetime not null default current_timestamp on update current_timestamp,
    primary key (id),
    constraint fk_atd_category foreign key (category) references category(id),
    constraint fk_atd_wallet foreign key (wallet) references wallet(id)
  )
`;

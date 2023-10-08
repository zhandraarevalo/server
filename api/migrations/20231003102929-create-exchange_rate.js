module.exports = `
  create table if not exists exchange_rate (
    id int not null auto_increment,
    amount float not null,
    strong int not null,
    weak int not null,
    created_at datetime not null default current_timestamp,
    updated_at datetime not null default current_timestamp on update current_timestamp,
    primary key (id),
    constraint fk_er_strong foreign key (strong) references currency(id),
    constraint fk_er_weak foreign key (weak) references currency(id)
  )
`;

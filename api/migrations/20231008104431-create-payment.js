module.exports = `
  create table if not exists payment (
    id int not null auto_increment,
    amount int not null,
    type varchar(255) not null,
    wallet int not null,
    transaction int not null,
    automated int,
    created_at datetime not null default current_timestamp,
    updated_at datetime not null default current_timestamp on update current_timestamp,
    primary key (id),
    constraint fk_pmt_wallet foreign key (wallet) references wallet(id),
    constraint fk_pmt_transaction foreign key (transaction) references transaction(id),
    constraint fk_pmt_automated foreign key (automated) references automated(id)
  )
`;

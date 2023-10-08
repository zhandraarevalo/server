module.exports = `
  create table if not exists wallet_backup (
    id int not null auto_increment,
    balance int not null,
    wallet int not null,
    backup int not null,
    created_at datetime not null default current_timestamp,
    updated_at datetime not null default current_timestamp on update current_timestamp,
    primary key (id),
    constraint fk_wb_wallet foreign key (wallet) references wallet(id),
    constraint fk_wb_backup foreign key (backup) references backup(id)
  )
`;

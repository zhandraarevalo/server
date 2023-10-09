module.exports = `
  create table if not exists transaction (
    id int not null auto_increment,
    date date not null,
    total_amount int not null,
    type varchar(255) not null,
    rate float,
    category int not null,
    created_at datetime not null default current_timestamp,
    updated_at datetime not null default current_timestamp on update current_timestamp,
    primary key (id),
    constraint fk_trn_category foreign key (category) references category(id)
  )
`;

module.exports = `
  create table if not exists user (
    id int not null auto_increment, 
    email varchar(255) not null,
    name varchar(255) not null,
    surname varchar(255) not null,
    birthday date not null,
    active boolean default true,
    google_id varchar(255),
    role int not null,
    created_at datetime not null default current_timestamp, 
    updated_at datetime not null default current_timestamp on update current_timestamp,
    primary key (id),
    constraint fk_usr_role foreign key (role) references role(id)
  )
`;
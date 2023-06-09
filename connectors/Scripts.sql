CREATE TABLE IF NOT EXISTS users
(
id SERIAL NOT NULL,
firstname text NOT NULL,
lastname text NOT NULL,
email text NOT NULL,
password text NOT NULL,
roleid integer NOT NULL,
CONSTRAINT users_pkey PRIMARY KEY (id)
);
insert into se_project.users("firstname" , "lastname" , "email" , "password" , "roleid" )
    Values('mariam' ,'khaled', 'mariamokby@gmail.com' , '1234' , 12);
CREATE TABLE IF NOT EXISTS sessions
(
id SERIAL NOT NULL,
userid integer NOT NULL,
token text NOT NULL,
expiresat timestamp NOT NULL,
CONSTRAINT sessions_pkey PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS roles
(
id SERIAL NOT NULL,
role text NOT NULL,
CONSTRAINT roles_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS zones
(
id SERIAL NOT NULL,
zonetype text NOT NULL, -- 9 stations/ 10-16/16
price INTEGER NOT NULL,
CONSTRAINT zones_pkey PRIMARY KEY (id)

);
insert into zones( "zonetype" , "price")
   Values(9 , 5);
CREATE TABLE IF NOT EXISTS subsription
(
id SERIAL NOT NULL,
subtype text NOT NULL, --annual --month -- quarterly
zoneid Integer NOT NULL,
userid INTEGER NOT NULL,
nooftickets INTEGER NOT NULL,
CONSTRAINT subsription_pkey PRIMARY KEY (id),
FOREIGN KEY( userid ) REFERENCES se_project.users,
FOREIGN KEY( zoneid ) REFERENCES se_project.zones

);
insert into se_project.subsription("subtype" , "zoneid" , "userid" , "nooftickets" )
    Values('annual' , 1 , 1 , 1);
CREATE TABLE IF NOT EXISTS tickets
(
id SERIAL NOT NULL,
origin text NOT NULL,
destination text NOT NULL,
userid INTEGER NOT Null,
subiD INTEGER,
tripdate timestamp not Null,
FOREIGN KEY( userid ) REFERENCES se_project.users,
FOREIGN KEY( subid ) REFERENCES se_project.subsription,
CONSTRAINT tickets_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS rides
(
id SERIAL NOT NULL,
status text NOT NULL,
origin text NOT NULL,
destination text NOT NULL,
userid INTEGER NOT NULL,
ticketid integer not null,
tripdate timestamp not null,
FOREIGN KEY( userid ) REFERENCES se_project.users,
FOREIGN KEY( ticketid ) REFERENCES se_project.tickets,
CONSTRAINT rides_pkey PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS transactions
(
id SERIAL NOT NULL,
amount INTEGER NOT NULL,
userid INTEGER NOT NULL,
purchasedIid text NOT NULL,
FOREIGN KEY( userid ) REFERENCES se_project.users,
CONSTRAINT transactions_pkey PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS refund_requests
(
id SERIAL NOT NULL,
status text NOT NULL,
userid Integer NOT NULL,
refundamount INTEGER not NULL,
ticketid INTEGER NOT null,
FOREIGN KEY( userid ) REFERENCES se_project.users,
FOREIGN KEY( ticketid ) REFERENCES se_project.tickets,
CONSTRAINT refund_requests_pkey PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS senior_requests
(
id SERIAL NOT NULL,
status text NOT NULL,
userid Integer NOT NULL,
nationalid INTEGER not null,
FOREIGN KEY( userid ) REFERENCES se_project.users,
CONSTRAINT senior_requests_pkey PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS se_project.stations
(
id SERIAL NOT NULL,
stationname text NOT NULL,
stationtype text NOT NULL, -- normal or transfer
stationposition text, -- start middle end
stationstatus text not null, -- new created or not
CONSTRAINT stations_pkey PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS routes
(
id SERIAL NOT NULL,
routename text Not null,
fromStationid INTEGER NOT NULL,
toStationid INTEGER NOT NULL,
CONSTRAINT routes_pkey PRIMARY KEY (id),
FOREIGN KEY( fromStationid ) REFERENCES se_project.stations on DELETE CASCADE on UPDATE CASCADE,
FOREIGN KEY( toStationid ) REFERENCES se_project.stations on DELETE CASCADE on UPDATE CASCADE

);

CREATE TABLE IF NOT EXISTS stationroutes
(
id SERIAL NOT NULL,
stationid INTEGER NOT NULL,
routeid INTEGER NOT NULL,
CONSTRAINT stationRoutes_pkey PRIMARY KEY (id),
FOREIGN KEY( stationid ) REFERENCES se_project.stations on DELETE CASCADE on UPDATE CASCADE,
FOREIGN KEY( routeid ) REFERENCES se_project.routes on DELETE CASCADE on UPDATE CASCADE
);

-- Insert Roles
INSERT INTO se_project.roles("role")
	VALUES ('user');
INSERT INTO se_project.roles("role")
	VALUES ('admin');
INSERT INTO se_project.roles("role")
	VALUES ('senior');	
-- Set user role as Admin
UPDATE se_project.users
	SET "roleid"=2
	WHERE "email"='desoukya@gmail.com';
	

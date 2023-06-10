const { get } = require('lodash');
const db = require('../../connectors/db');
const roles = require('../../constants/roles');
const { getSessionToken } = require('../../utils/session');

const getUser = async function(req) {
  const sessionToken = getSessionToken(req);
  if (!sessionToken) {
    return res.status(301).redirect('/');
  }

  const user = await db.select('*')
    .from('se_project.sessions')
    .where('token', sessionToken)
    .innerJoin('se_project.users', 'se_project.sessions.userid', 'se_project.users.id')
    .innerJoin('se_project.roles', 'se_project.users.roleid', 'se_project.roles.id')
    .first();
  
  console.log('user =>', user)
  user.isStudent = user.roleid === roles.student;
  user.isAdmin = user.roleid === roles.admin;
  user.isSenior = user.roleid === roles.senior;

  return user;  
}

module.exports = function(app) {
  // Register HTTP endpoint to render /users page
  app.get('/dashboard', async function(req, res) {
    const user = await getUser(req);
    return res.render('dashboard', user);
  });
  app.get('/nosub' , async function(req , res){
    const userID = await getUser(req);
    return res.render('nosub', userID);
   })
   app.get('/NoTicket' , async function(req , res){
    const userID = await getUser(req);
    return res.render('NoTicket', userID);
   })
   app.get('/NoRide' , async function(req , res){
    const userID = await getUser(req);
    return res.render('NoRide', userID);
   })
   app.get('/Nope' , async function(req , res){
    const userID = await getUser(req);
    return res.render('Nope', userID);
   })
   app.get('/subscriptions', async function(req, res) {
       user = await getUser(req);
       HasSub = await db
        .select('userid')
        .from('se_project.subsription')
        .where('userid','=', user.userid);
      if (HasSub.length>0) { // Check if length is greater than 0
       const sub = await db
        .select('*')
        .from('se_project.subsription')
        .where('userid','=', user.userid);
       return res.render('subscriptions', {sub});
      } else {
      return res.status(301).redirect('/nosub');
    }
  });
  app.get('/mytickets' , async function(req , res){
   user = await getUser(req);
   HasTicket = await db
        .select('userid')
        .from('se_project.tickets')
        .where('userid','=', user.userid);
      if (HasTicket.length>0) { // Check if length is greater than 0
       const ticket = await db
        .select('origin' , 'destination' , 'tripdate')
        .from('se_project.tickets')
        .where('userid','=', user.userid);
       return res.render('mytickets', {ticket});
      } else {
      return res.status(301).redirect('/NoTicket');
    }
  });
  app.get('/requests/refund' , async function(req , res){
    user = await getUser(req);
    Refo = await db
         .select('userid')
         .from('se_project.refund_requests')
         .where('userid','=', user.userid);
       if (Refo.length>0) { // Check if length is greater than 0
        const refund = await db
         .select('status' , 'refundamount')
         .from('se_project.refund_requests')
         .where('userid','=', user.userid);
        return res.render('requests/refund', {refund});
       } else {
       return res.status(301).redirect('/NoTicket');
     }
   });
   app.get('/manage/request/viewsenior' , async function(req , res){
    user = await getUser(req);
    if (user.id == 2){
        const senior = await db
         .select('status' , 'nationalid')
         .from('se_project.senior_requests')
         .where('status' ,'=' ,'Pending');
        return res.render('manage/request/viewsenior', {senior});
    }else{
      return res.status(301).redirect('/Nope');
    }
   });
  app.get('/rides', async function(req, res) {
   
       user = await getUser(req);
       hasRide = await db
        .select('userid')
        .from('se_project.rides')
        .where('userid', '=', user.userid);
  
      if (hasRide.length > 0) {
        const ride = await db
          .select('status', 'origin', 'destination', 'tripdate')
          .from('se_project.rides')
          .where('userid', '=', user.userid);
  
        return res.render('rides', { ride });
      } else {
        return res.status(301).redirect('/NoRide');
      }
  });
 
  // Register HTTP endpoint to render /users page
  app.get('/users', async function(req, res) {
     users = await db.select('*').from('se_project.users');
    return res.render('users', { users });
  });
  // Register HTTP endpoint to render /courses page
  app.get('/stations', async function(req, res) {
    const user = await getUser(req);
    const stations = await db.select('*').from('se_project.stations');
    return res.render('stations_example', { ...user, stations });
  });
  app.get('/resetPassword', async function(req, res) {
    const users = await getUser(req);
    return res.render('resetPassword', {users});
  });
  app.get('/viewsubscriptions', async function (req, res) { 
      subs = await db.select('subtype' , 'nooftickets').from('se_project.subs');
     return res.render('viewsubscriptions' , {subs})
 
  });
  app.get('/subscriptions/purchase' , async function(req , res){
    const users = await getUser(req);
    return res.render('subscriptions/purchase' , users)
  });
  app.get('/tickets/purchase' , async function(req , res){
   const user = await getUser(req);
   return res.render('tickets/purchase', user)
  });
  app.get('/prices' , async function(req , res){
    const user = await getUser(req);
    return res.render('prices', user)
   });
   app.get('/manage/request/senior' , async function(req , res){
    const user = await getUser(req);
    if(user.id ==2){
    return res.render('manage/request/senior', user)
    }
    else{
      return res.status(301).redirect('/Nope');
    }
   });
   app.get('/tickets' , async function(req , res){
    const user = await getUser(req);
    return res.render('tickets', user)
   });
   app.get('/requests/senior' , async function(req , res){
    const user = await getUser(req);
    return res.render('requests/senior', user)
   });
   app.get('/manage/routes', async function(req, res) {
    const user = await getUser(req);
    const routes = await db.select('*').from('se_project.routes');
    return res.render('manage/routes', { ...user, routes });
  });
  app.get('/manage/stations/edit/:stationId' , async function(req , res){
    const users = await getUser(req);
    return res.render('manage/stations/edit/stationId' , users)
  });
  app.get('/manage/routes/create' , async function(req , res){
    const users = await getUser(req);
    return res.render('manage/routes/create' , users)
  });
  app.get('/manage/zones' , async function(req , res){
    const users = await getUser(req);
    const zones = await db.select('*').from('se_project.zones');

    return res.render('manage/zones' ,{...users,zones})
  });
  app.get('/manage/routes/edit' , async function(req , res){
    const users = await getUser(req);
    return res.render('/manage/routes/edit' , users)
  });
   app.get('/manage/stations/create' , async function(req , res){
    const users = await getUser(req);
    return res.render('manage/stations/create' , users)
  });

};

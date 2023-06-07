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
   app.get('/subscriptions', async function(req, res) {
     user = await getUser(req);
     HasSub = await db
      .select('userid')
      .from('se_project.subsription')
    if (HasSub.length > 0) { // Check if length is greater than 0
       user = await getUser(req);
       const sub = await db
        .select('*')
        .from('se_project.subsription')
        .where('userid','=', user.userid);
      return res.render('subscriptions', {sub });
    } else {
      return res.status(301).redirect('/nosub');
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
  app.get('/passwordreset', async function(req, res) {
    const users = await getUser(req);
    return res.render('passwordreset', {users});
  });
  app.get('/viewsubscriptions', async function (req, res) { 
      subs = await db.select('subtype' , 'nooftickets').from('se_project.subs');
     return res.render('viewsubscriptions' , {subs})
 
  });
  app.get('/subscriptions/purchase' , async function(req , res){
    const user = await getUser(req);
    return res.render('subscriptions/purchase' , user)
  })
};
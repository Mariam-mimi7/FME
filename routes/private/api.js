const { isEmpty, get } = require("lodash");
const { v4 } = require("uuid");
const db = require("../../connectors/db");
const roles = require("../../constants/roles");
const {getSessionToken}=require('../../utils/session')
const getUser = async function (req) {
  const sessionToken = getSessionToken(req);
  if (!sessionToken) {
    return res.status(301).redirect("/");
  }
  console.log("hi",sessionToken);
  const user = await db
    .select("*")
    .from("se_project.sessions")
    .where("token", sessionToken)
    .innerJoin(
      "se_project.users",
      "se_project.sessions.userid",
      "se_project.users.id"
    )
    .innerJoin(
      "se_project.roles",
      "se_project.users.roleid",
      "se_project.roles.id"
    )
   .first();

  console.log("user =>", user);
  user.isNormal = user.roleid === roles.user;
  user.isAdmin = user.roleid === roles.admin;
  user.isSenior = user.roleid === roles.senior;
  console.log("user =>", user)
  return user;
};

module.exports = function (app) {
  // example
  app.get("/users", async function (req, res) {
    try {
       const user = await getUser(req);
      const users = await db.select('*').from("se_project.users")
        
      return res.status(200).json(users);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not get users");
    }
   
  });
 //Reset Password
 app.put("/api/v1/password/reset" , async function(req , res){
  const user = await getUser(req);
  const newpassword = req.body.newpassword;
  if(!newpassword){
     return res.status(400).send("Required!");
  }else{
      db.from("se_project.users")
      .where("email" , user.email)
      .update({password:newpassword}).then(function(rowsUpdated){
        res.status(200).json({message: 'password updated'})});
    }
 });

 app.post("/api/v1/payment/ticket" , async function(req,res){
   const {creditCardNumber , holderName , payedAmount , origin , destination , tripDate } = req.body;
   const userId = await getUser(req);
   const userhasSub = await db.select('userid').from("subsription");
   if(userhasSub.userid == userId.id){
     return res.status(400).send("Failed.You have a subscription");
   }else{
   
    ticket_data = {
     origin: req.body.origin,
     destination:req.body.destination,
      userid:userId.userid,
      tripdate:req.body.tripDate
    };
     const ticket = await db("tickets").where("origin" , ' = ' , origin).where("destination" ,'=', destination)
     .where("tripddate" , '=', tripDate)
     .insert(ticket_data).returning("*")
    
    if(ticket == true){ 
      tran_data={
        amount:req.body.payedAmount,
        userid:userId.userid,
        purchasediid:ticket.id
      };
      const tran = await db("se_project.transactions")
      .where("amount" , '=' , payedAmount)
      .insert(tran_data)
   }if (ticket){
     return res.status(200).send("Ticket purchased");
   }else{
    return res.status(400).send("Failed.Ticket not purchased");
   }
  }
 });
 app.post("/api/v1/payment/subscription" , async function(req,res){
   const { creditCardNumber , holderName , payedAmount , subType , zoneId } = req.body;
   const user = await getUser(req);
     if(subType == "annual"){
         nooftickets =100;
      }else if (subType == "quarterly"){
           nooftickets = 50;
      } else if (subType == "monthly"){
           nooftickets = 10;
      }
      
  const subscription_data = {
   subtype:req.body.subType,
   zoneid:req.body.zoneId,
   userid:user.userid,
   nooftickets
 }     
   const insertsubs =await db("se_project.subsription")
   .where("subtype" , '=' , subType)
    .where("zoneid" , '=' , zoneId)
   .where("nooftickets" , '=' , nooftickets)
   .insert(subscription_data).returning("*");
  if(insertsubs){
    if(nooftickets == 100){
      return res.status(200).send("Subscription paid now you got 100 tickets");
    
   }else if (nooftickets == 50){
        return res.status(200).send("Subscription paid now you got 50 tickets");
        
   } else if (nooftickets == 10){
       return res.status(200).send("Subscription paid now you got 10 tickets");
   } 
  }else{
  return res.status(400).send("Could not pay subscription");  
  }  
  const transaction_data = {
    amount:req.body.payedAmount,
    userid:user.userid,
    purchasediid: insertsubs.id
  }
  const tran = await db("se_project.transactions")
   .where("amount" , '=' , payedAmount)
   .insert(transaction_data).returning('*')

  });

 app.post("/api/v1/tickets/purchase/subscription" , async function(req , res){
   const userID = await getUser(req);
   const {subId , origin , destination , tripDate} = req.body;
   const userhasSub = await db.select('userid').from("subsription");
        if(userhasSub.userid == userID.id){
          const ticket_data = {
            userid:userID.id,
            subid:req.body.subId,
            origin:req.body.origin,
            destination:req.body.destination,
            tripdate:req.body.tripDate
          };
           const insertticket = await db("se_project.tickets")
           .where("subid" , '=' , subId)
           .where("origin" , '=' , origin)
           .where("destination" , '=' , destination)
           .where("tripdate" , '=' , tripDate)
           .insert(ticket_data);

             if(insertticket){
          return res.status(200).send("Ticket payed through subscription successfully!");
             }
        }else{
          return res.status(400).send("Failed.You have no subscription!");
        }
 });
   app.post("/api/v1/station", async function (req, res){
  const {stationName} = req.body;
  if(!stationName){
    return res.status(400).send("Please enter name for the new station");
  }
  

  const newstation = {
  stationname : stationName ,
  stationtype : "normal",
  stationposition : null,
  stationstatus :"new created"

  };

  try {
    const station = await db("se_project.stations").insert(newstation).returning("*");

    return res.status(200).json(station );
  } catch (e) {
    console.log(e.message);
    return res.status(400).send("Could not create station");
  }
});
};

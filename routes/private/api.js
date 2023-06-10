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
  app.get("/api/v1/zones" , async function(req,res){
    const user = await getUser(req);
    try{
      if(user){
        const zones = await db.select("*")
        .from("zones");
        res.status(200).send(zones);
      }else{
        res.status(400).send("Please login first");
      }
        }catch(e){
        res.status(500).send(e);
    }
  });
  app.get("/api/v1/tickets/price/:originId/:destinationId", async function(req, res) {  
    try {
      const user = await getUser(req)  
      const { originId, destinationId } = req.params;  // using req.params instead of req.query
    const from = await db("se_project.routes")
      .select(["fromstationid"])
      .where("fromstationid", "=", originId);
    const to = await db("se_project.routes")
      .select(["tostationid"])
      .where("tostationid", "=", destinationId);
  if(user){    
    for (let i = 0; i < from.length; i++) {
      for (let j = 0; j < to.length; j++) {
        if (originId == destinationId){
          res.status(400).send("Please ensure that current location is not the destination");
          break;
        }
        if (from[i].fromstationid >= 1 && to[j].tostationid <=9) {
          res.status(200).send("From your current location to destination = Ticket price is 5LE");
          break;
        } else if (from[i].fromstationid >=1 && to[j].tostationid <= 16) {
          res.status(200).send("From your current location to destination = Ticket price is 7LE");
          break;
        } else if (from[i].fromstationid >= 1 && to[j].tostationid > 16) {
          res.status(200).send("From your current location to destination = Ticket price is 10LE");
        }
      }
    }
  }else{
    res.status(400).send("Please login to proceed");
  }
  } catch (e) {
    return res.status(400).send("Something went wrong");
  }
  });
  app.post('/api/v1/refund/:ticketId', async function(req, res) {
    try {
      const {ticketId} = req.params;
      const user = await getUser(req);
      const ticket = await db('se_project.tickets')
                      .where('id', ticketId)
                      .where('userid','=', user.userid)
                      .first();
      const ride = await db('se_project.rides').where("ticketid", ticketId).first();
       tran = await db('se_project.transactions').where("userid", '=',user.userid).first();
       if(tran.length==0){
        return res.status(400).send('Ya haramy enta mesh dafe3 ticket ')
       }
      if (!ticket) {
        return res.status(400).send("Invalid Ticket ID");
      }
      if(ride) {
        if(ride.status === "Active"){
          if(tran){
            const refund_data = {
               status:"Accepted",
               userid:user.userid,
               refundamount:tran.amount,
               ticketid:ticket.id
            }
            refund = await db('se_project.refund_requests')
            .where('status' ,"Accepted")
            .where('refundamount' , tran.amount)
            .insert(refund_data);
            }else{
             return res.status(400).send("Ya haramy enta mesh dafe3 ticket aslun")
            }
           await db('se_project.rides').where("ticketid", ticketId).del();  
          return res.status(200).send("Ticket Refunded!");
        } else if (ride.status === "Expired") {
          const refund_data = {
            status:"Rejected",
            userid:user.userid,
            refundamount:tran.amount,
            ticketid:ticket.id
         }
         refund = await db('se_project.refund_requests')
         .where('status' , "Rejected")
         .where('refundamount' , tran.amount)
         .insert(refund_data);
          return res.status(400).send("You cannot refund an expired ticket.");
        }
        
      } else {
        return res.status(400).send("Oops :(");
      }
    } catch (error) {
      console.log(error);
      return res.status(400).send("Something went wrong");
    }
  });
 //Reset Password
 app.put("/api/v1/password/reset" , async function(req , res){
  const user = await getUser(req);
  newpassword = req.body.newpassword;
  if(!newpassword){
     return res.status(400).send("Required!");
  }else{
      db.from("se_project.users")
      .where("email" , user.email)
      .update({password:newpassword}).then(function(rowsUpdated){
        res.status(200).send("Password Updated")});
      
    }
 });

 app.post("/api/v1/payment/ticket", async function(req, res) {
  try {
    const { creditCardNumber, holderName, payedAmount, origin, destination, tripDate } = req.body;
    const userId = await getUser(req);
    const userHasSub = await db.select('userid').from("se_project.subsription").where('userid', '=',userId.userid).first();
    if (userHasSub) {
      return res.status(400).send("Failed. You have a subscription");
    } else {
      const ticketData = {
        origin: req.body.origin,
        destination: req.body.destination,
        userid: userId.userid,
        tripdate: req.body.tripDate
      };
      
      const insertedTicket = await db("se_project.tickets")
        .insert(ticketData)
        .returning("*");
      
      if (insertedTicket.length > 0) {
        const transactionData = {
          amount: req.body.payedAmount,
          userid: userId.userid,
          purchasediid: insertedTicket[0].id
        };
        const insertedTransaction = await db("se_project.transactions")
          .insert(transactionData)
          .returning("*");
      
        let message = '';
        if (req.body.payedAmount === 5) {
          message = "Zone 1 Ticket purchased";
        } else if (req.body.payedAmount === 7) {
          message = "Zone 2 Ticket purchased";
        } else if (req.body.payedAmount === 10) {
          message= "Zone 3 Ticket purchased";
        }
        return res.status(200).send(message);
      }
    }
   
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal server error");
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
  app.get("/api/v1/subs" , async function(req,res){
    try{
        const userID = await getUser(req);
        const HasSub = await db.select("userid").from("se_project.subsription");
        if(HasSub.userid == userID.id){
        const subs = await db.select("subtype")
        .from("se_project.subsription");
        res.status(200).send(subs);
        }else{
          res.status(200).send('You Have no subscriptions');
        }
        }catch(e){
        res.status(500).send(e);
    }
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
 //Mariam
 //----------------------------------------------------------------------------
 //Farah w Esraa
   app.post("/api/v1/station", async function (req, res){
  const {stationName} = req.body;
  if(!stationName){
    return res.status(400).send("Please enter name for the new station");
  }
  

  const newstation = {
  stationname : stationName ,
  stationtype : "normal",
  stationposition : "",
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


app.put("/api/v1/station/:stationId", async function (req, res) {
  try {
    const id = req.params.stationId;
    console.log(`id :  ${id}`, req.body.stationname);
    const response = await db("se_project.stations")
      .where("id", "=", id)
      .update({
        stationname: req.body.stationname,
      })
      .returning("*");

    //db.raw(`update se_project.stations set stationname = ${req.body.stationname} where id = ${id};`);
    console.log(`response :  ${response}`);
    return res.status(200).send("updated successfully");
    //return res.status(200).json(response );
  } catch (e) {
    console.log(e.message);
    return res.status(400).send("Could not update station name");
  }
});




app.delete("/api/v1/station/:stationId", async (req, res) => {
  const id = req.params.stationId;
  const station = await db("se_project.stationroutes")
    .select(["routeid"])
    .where({ stationid: id });

  if (station.length === 0) {
    return res.status(404).send();
  }

  for (let i = 0; i < station.length; i++) {
    const routeId = station[i].routeid;
    const from = await db("se_project.routes")
      .select(["fromstationid"])
      .where({ id: routeId });

      const to = await db("se_project.routes")
      .select(["tostationid"])
      .where({ id: routeId });

    if (from.length > 0) {
      await db("se_project.routes")
        .where({ fromstationid: id })
        .update({ fromstationid: from[0].fromstationid-1 });

      await db("se_project.stationroutes")
      .where({ routeid:routeId })
      .update({ stationid: from[0].fromstationid });


      
    }
    if (to.length > 0) {
      await db("se_project.routes")
        .where({ tostationid: id })
        .update({ tostationid: (to[0].tostationid)+1 });

        await db("se_project.stationroutes")
        .where({ routeid:routeId })
        .update({ stationid: (to[0].tostationid)+1 });
  
    }
  }

  try {
    const response = await db("se_project.stations")
      .where("id", "=", id)
      .del()
      .returning("*");

    res.status(200).json(response);
  } catch (e) {
    console.log(e.message);
    res.status(400).send("Could not delete station.");
  }
});



get("/api/v1/station", async function (req, res) {
try{
    const station = await db("se_project.stations")
      .select('*');
      
    
      if (station.length===0){
        return res.status(404).send("no stations here");

      }
      else{
        return res.status(200).json(station);
      }
    }catch{
      console.log(e.message);
    return res.status(400).send("error");
      
   }

  
  });
  


app.get("/api/v1/station/:stationId", async function (req, res) {
  const id = req.params.stationId;

  try {
    const station = await db("se_project.stationroutes")
      .select(["routeid"])
      .where({ stationid: id });

    if (station.length === 0) {
      return res.status(404).send();
    }

    for (let i = 0; i < station.length; i++) {
      const routeId = station[i].routeid;
      const from = await db("se_project.routes")
        .select(["fromstationid"])
        .where({ id: routeId });
      const to = await db("se_project.routes")
        .select(["tostationid"])
        .where({ id: routeId });

      if (from.length > 0) {
        await db("se_project.routes")
          .where({ fromstationid: id })
          .update({ fromstationid: from[0].fromstationid - 1 });
      }

    }

    const response = await db("se_project.routes").returning("*");
    res.send(response);
  } catch (err) {
    console.error(err);
    res.status(500).send();
  }
});

app.post("/api/v1/routes", async function (req, res) {
  const { newStationId, connectedStationId, routeName } = req.body;

  // Validate input data
  if (!newStationId || !connectedStationId || !routeName) {
    return res.status(400).send("Missing required input data");
  }

  // Check if station is new
  try {
    const helper = await db("se_project.stations").select('*').where({id:newStationId}).where({stationstatus:"new created"});
    if (helper.length === 0) {
      return res.status(400).send("The station is not newly created");
    }
  } catch (e) {
    console.error('Error checking station status:', e);
    return res.status(500).send("Internal server error");
  }

  // Update station status
  try {
    await db("se_project.stations").where({id:newStationId}).update({stationstatus:"old"}).timeout(1000);  
  } catch (e) {
    console.error('Error updating station status:', e);
    return res.status(500).send("Internal server error");
  }

  // Insert new route
  try {
    const newRoute = {
      routename: routeName,
      fromstationid: newStationId,
      tostationid: connectedStationId,
    };
    const route = await db("se_project.routes").insert(newRoute).returning("*");
    return res.status(200).json(route);
  } catch (e) {
    console.error('Error inserting new route:', e.message);
    return res.status(500).send("Internal server error");
  }
});



app.put("/api/v1/route/:routeId", async function (req, res){

  try {
    const id = req.params.routeId;
    
    //console.log(`id :  ${id}`,req.body.routeName);
    const response = await db("se_project.routes").where('id','=',id).update({
      routename:req.body.routeName
        }).returning("*");

    //db.raw(`update se_project.stations set stationname = ${req.body.stationname} where id = ${id};`);
    console.log(`response :  ${response}`)
    return res.status(200).send("updated  route successfully")
    //return res.status(200).json(response );
  } catch (e) {
    console.log(e.message);
    return res.status(400).send("Could not update route name");
  }

  
});

app.put("/api/v1/zones/:zoneId", async function (req, res) {
  try {
    const id = req.params.zoneId;
    //console.log(`id :  ${id}`, req.body.stationname);
    const response = await db("se_project.zones")
      .where("id", "=", id)
      .update({
        price: req.body.price,
      })
      .returning("*");

    //db.raw(`update se_project.stations set stationname = ${req.body.stationname} where id = ${id};`);
    //console.log(`response :  ${response}`);
    return res.status(200).send("updated successfully");
    //return res.status(200).json(response );
  } catch (e) {
    console.log(e.message);
    return res.status(400).send("Could not update zone price");
  }
});

app.delete("/api/v1/route/:routeId", async (req, res) => {
  const routeId = req.params.routeId;
  const route = await db("se_project.routes")
    .where("id", "=", routeId)
    .first();
  if (!route) {
    return res.status(400).send("Route not found");
  }
  const { fromstationid, tostationid } = route;

  const [fromstation, tostation] = await Promise.all([
    db("se_project.stations")
      .select("stationposition")
      .where("id", "=", fromstationid)
      .first(),
    db("se_project.stations")
      .select("stationposition")
      .where("id", "=", tostationid)
      .first(),
  ]);

  if (fromstation.stationposition === "middle" || tostation.stationposition === "middle") {
    return res.status(400).send("Could not delete route with middle stations");
  }

else{
  const rowsDeleted = await db("se_project.routes")
    .where("id", "=", routeId)
    .del();

  return res.status(200).send("deleted");
}
});


// using knex library and express js
app.put("/api/v1/ride/simulate", async function (req, res) {
  try {
    const user = await getUser(req);
    const origin = req.body.origin;
    const destination = req.body.destination;
    const tripDate = req.body.tripDate;
    ride = await db("se_project.rides").where('userid','=',user.userid)
    if(ride.length>0){
    await db("se_project.rides")
      .where({ origin: origin, destination: destination, tripdate: tripDate })
      .update({ status: "Active" })
      .returning("*");
    return res.status(200).send("accepted successfully");
    }else{
      return res.status(400).send("ride not found");
    }
  } catch (e) {
    console.log(e);
    return res.status(400).send("error");
  }
});
//Request Senior 
app.post('/api/v1/senior/request',async function(req, res){ 
  try{
  const nationalId = req.body.nationalId;
  const user = await getUser(req);
  if(!nationalId){
    return res.status(400).send("Please enter nationalid");
  }
  const newrequest = {
  status :"Pending",
  userid : user.userid,
  nationalid :nationalId,
  };
    const request = await db("se_project.senior_requests").where('nationalid' , '=' ,nationalId ).insert(newrequest);
    if(request)
    return res.status(200).send("Successfully Requested!");
  } catch (e) {
    console.log(e.message);
    return res.status(400).send("Could not request senior");
  }
});
app.put('/api/v1/requests/senior/:requestId', async function(req, res) {
  try {
    const user = await getUser(req);
    const { requestStatus } = req.body;
    const ID = req.params.requestId;

    const senior = await db('se_project.senior_requests').select('nationalid', 'userid').where('id', '=', ID);
    if(senior.length > 0) {
      if(senior[0].nationalid == 3 && requestStatus == "Accept") {
        db.from("se_project.senior_requests")
          .where("id", ID)
          .update({ status: requestStatus })
          .then(function(rowsUpdated) {
            res.status(200).send("Request Accepted!")
          });
      } else if(senior[0].nationalid !== 3 && requestStatus == "Reject") {
        db.from("se_project.senior_requests")
          .where("id", ID)
          .update({ status: requestStatus })
          .then(function(rowsUpdated) {
            res.status(200).send("Request Rejected!")
          });
      } else if (senior[0].nationalid !== 3 && requestStatus == "Accept")  {
        res.status(400).send("Something went wrong")
      }
      else if (senior[0].nationalid == 3 && requestStatus == "Reject")  {
        res.status(400).send("Something went wrong")
      }
    } else {
      res.status(404).send("Request not found")
    }
  } catch (e) {
    console.log(e);
    return res.status(400).send("error");
  }
});
app.put('/api/v1/requests/refunds/:requestId', async function(req, res) {
  try {
    const id = req.params.requestId;
    const refundRequest = await db("se_project.refund_requests")
      .select("ticketid")
      .where('id', '=', id)
      .first();

    if (!refundRequest) {
      return res.status(404).send("refund request not found");
    }

    const { ticketid } = refundRequest;
    const [{ tripdate }] = await db("se_project.tickets")
      .select("tripdate")
      .where({ id: ticketid });

    if (tripdate < currenttime) {
      await db("se_project.refund_requests")
        .where({ id })
        .update({ status: req.body.refundStaus })
        .returning("*");
    }

    return res.send("Refund accepted successfully");
  } catch (error) {
    console.log(error.message);
    return res.status(400).send("Could not accept refund");
  }
});

};


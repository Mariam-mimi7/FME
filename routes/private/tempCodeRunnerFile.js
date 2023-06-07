 app.get('/subscriptions', async function(req, res) {
     user = await getUser(req);
     HasSub = await db
      .select('userid')
      .from('se_project.subsription')
    if (HasSub.length > 0) { // Check if length is greater than 0
       user = await getUser(req);
       const sub = console.log(  await db
        .select('*')
        .from('se_project.subsription')
        .where('userid', user.id))
      return res.render('subscriptions', {user , sub });
    } else {
      return res.status(301).redirect('/nosub');
    }
  });
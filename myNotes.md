1. Pool
To connect and run raw sql queries i have use pool , its a easy one though

2. Express Router - api scalablilty problem
Here i have used express router so that all routes of that url will go that handler an handler is yk a fcuntion that handles or process or request
I have just completed all the crud api's of drops route

3. SQL injection - got an problem
while i was writing sql queries in pool i found the loophole of sql injections in query paramters to avaoid that i have used the paramters with $ n [] and not in the ${} so that user can't be oversmart with the url here okay 

4. bcrypt
i have already used this for my previous projects uses salt and salt rounds and creates a new hash , then with compare we compare and verify if the hashpassowrd and current password is correct

5. jwt 
json web token used this also , takes the bearer from the user request see if the token is valid and not expired and then goes to next() request

6. -D & types 
these are dev dependencies we know .
types is used for the tpescript made by ts community as most npm packages are written in js so how ts will know the methods and all that's we need types in npm install -D/types@--

7. Postman 
already used many times for sending requests

8. middlewares 
using authenticate as an middleware we know middleware 
remeber after a middleware exuction we shouldcall next() so that next handler can run or start it's execution

9. Reservation queries - two  queries in v1 - problem here 

''
Look at these two operations:

INSERT INTO reservations ...

then:

UPDATE drops
SET available_inventory = available_inventory - 1
''
now supppose  INSERT reservation
      ↓
SUCCESS ✅
      ↓
UPDATE inventory
      ↓
💥 DATABASE ERROR   
here the 2nd dont run now reservation will be 1 but the inventory values is also 1 not 0 as it didnt run because of twp separate queries in case one run one fail 

10. DB transactions are used to solve this above problem 
we will be using transactions for this so it will look like 
begin;
-operation one 
--operation two
--operation three
end;
commit;

if all are completed then commmit otherwise rollback to the previous state okay 

11. one connection pool for a transaction 
-we need a single connection pool for a transaction not like multiple pools performing multiple sql queries of a transaction so basically
We can't simply do:

await pool.query("BEGIN");

await pool.query("INSERT ...");

await pool.query("UPDATE ...");

await pool.query("COMMIT");

Because there's another important concept:

A transaction belongs to one database connection.

Remember our connection pool?

Pool
├── Connection A
├── Connection B
├── Connection C
└── Connection D

If:

pool.query("BEGIN")

uses Connection A...

and the next:

pool.query("INSERT...")

gets Connection C...

then our transaction is broken.

---so the solution to this is---

So for transactions, we get one specific client from the pool:

const client = await pool.connect();

Then:

await client.query("BEGIN");

await client.query(...);
await client.query(...);

await client.query("COMMIT");

 client.release();

 The same connection performs the entire transaction.

12. postgresql working of a query
 why do postgresql treats every query as a one , simply because of the we dont tell  it specifically as each statement is started with BEGIN so it treats each statement as a independent transxaction with the begin and end so our problem say 

  What I meant

When our API does:

await client.query("UPDATE ...");

PostgreSQL has to decide:

"Should I make this change permanent now, or should I wait?"

If you haven't explicitly started a transaction with:

BEGIN;

PostgreSQL treats each SQL statement as its own transaction.

So this:

await client.query("UPDATE ...");

is effectively:

BEGIN
   UPDATE drops ...
COMMIT

automatically.

Then this:

await client.query("INSERT ...");

is a separate transaction:

BEGIN
   INSERT reservation ...
COMMIT

 If the INSERT fails, PostgreSQL rolls back that INSERT's transaction, but the previous UPDATE has already been committed.

 so an solution for this will be the put these two statements in a transanction with a connection pool , okay 


13. try catch finally 
 we already know this try catch finally - try will run fidt line by line and if any error happens then execution is halted and then whater ever is happend that error is is thrown from the js call stack as an error object and searches for the nearest catch block and then error is shown i mean the catch blocj is executed and then finally - finally will run even if error no error try runs or fails , even if catch runs finally will run in both cases 


1.Pool
To connect and run raw sql queries i have use pool , its a easy one though

2.Express Router - api scalablilty problem
Here i have used express router so that all routes of that url will go that handler an handler is yk a fcuntion that handles or process or request
I have just completed all the crud api's of drops route

3.SQL injection - got an problem
while i was writing sql queries in pool i found the loophole of sql injections in query paramters to avaoid that i have used the paramters with $ n [] and not in the ${} so that user can't be oversmart with the url here okay 

4.bcrypt
i have already used this for my previous projects uses salt and salt rounds and creates a new hash , then with compare we compare and verify if the hashpassowrd and current password is correct

5.jwt 
json web token used this also , takes the bearer from the user request see if the token is valid and not expired and then goes to next() request

6.-D & types 
these are dev dependencies we know .
types is used for the tpescript made by ts community as most npm packages are written in js so how ts will know the methods and all that's we need types in npm install -D/types@--

7.Postman 
already used many times for sending requests

8.middlewares 
using authenticate as an middleware we know middleware 
remeber after a middleware exuction we shouldcall next() so that next handler can run or start it's execution

9.
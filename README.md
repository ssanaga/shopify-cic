# shopify-cic
Shopify CIC integration


1. Create a shopify developer account
2. Enable MultiPass on the account by settings -> Customer Accounts -> MultiPass
3. Enable the Login link shown in online store and checkout under Customer accounts as well
4. Create a SPA App in Auth0 with callback URL as https://<storename>.myshopify.com
5. Create Logout URLs as https://<Account>.myshopify.com/account/logout
6. Create Post login action: PostLoginAction.js and add it to the login flow

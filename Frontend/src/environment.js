let IS_PROD = true;

const server =  IS_PROD ? 
    "https://buddycall-backend-e0r6.onrender.com" :
    "http://localhost:8000"
   


export default server;
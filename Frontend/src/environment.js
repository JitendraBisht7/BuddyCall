let IS_PROD = false;

const server =  IS_PROD ? 
    "https://buddycall-backend-e0r6.onrender.com" :
    `http://${window.location.hostname}:8000`
   


export default server;
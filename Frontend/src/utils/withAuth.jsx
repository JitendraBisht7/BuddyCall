import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

const withAuth = (WrappedComponet) => {
    const AuthComponent = (props) => {
        const router = useNavigate();

        const isAuthenticated = () => {
            if(localStorage.getItem("token")) {
                return true;
            } 
            return false;
        }

        useEffect(() => {
            if(!isAuthenticated()) {
                router("/auth")
            }
        }, [])

        return <WrappedComponet {...props}/>
    }
    return AuthComponent
}

export default withAuth;
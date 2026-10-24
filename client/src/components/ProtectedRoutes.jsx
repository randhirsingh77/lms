import { useSelector } from "react-redux"
import { Navigate } from "react-router-dom";

// These guards only run AFTER the session gate in main.jsx has settled
// the /profile probe (with retries for a waking API), so isAuthenticated
// here is a settled fact, not a mid-refresh guess. `replace` keeps the
// guard redirect out of the history stack — Back should never land the
// user on a page that instantly redirects again.
export const ProtectedRoute = ({children}) => {
    const {isAuthenticated} = useSelector(store=>store.auth);

    if(!isAuthenticated){
        return <Navigate to="/login" replace/>
    }

    return children;
}
export const AuthenticatedUser = ({children}) => {
    const {isAuthenticated} = useSelector(store=>store.auth);

    if(isAuthenticated){
        return <Navigate to="/" replace/>
    }

    return children;
}

export const AdminRoute = ({children}) => {
    const {user, isAuthenticated} = useSelector(store=>store.auth);

    if(!isAuthenticated){
        return <Navigate to="/login" replace/>
    }

    if(user?.role !== "instructor"){
        return <Navigate to="/" replace/>
    }

    return children;
}

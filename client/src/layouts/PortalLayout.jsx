import { Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";


const PortalLayout=()=>{


const {user}=useAuth();


return(

<div className="min-h-screen bg-[#f4f6f5]">


<header className="
h-16
bg-[#0f2b1d]
flex
items-center
justify-between
px-8
text-white
">


<div className="flex items-center gap-4">


<div className="
bg-[#1f7a45]
px-3 py-2
rounded-lg
font-bold
">

SP

</div>


<h1 className="font-bold text-lg">

SupportPilot

</h1>



<nav className="
hidden md:flex
gap-8
ml-10
text-sm
text-gray-300
">

<span className="text-white font-semibold">
My tickets
</span>

<span>
Raise a ticket
</span>

<span>
Self-help
</span>


</nav>


</div>




<div className="
h-10
w-10
rounded-full
bg-[#1f7a45]
flex
items-center
justify-center
font-bold
">

{
user?.name
?.substring(0,2)
.toUpperCase()
}

</div>



</header>



<main className="p-6">

<Outlet/>

</main>



</div>

);


};


export default PortalLayout;
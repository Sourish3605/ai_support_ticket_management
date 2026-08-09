import {useNavigate} from "react-router-dom";


const tickets=[

{
p:"P2",
title:"VPN connection failing on corporate network",
id:"IT-2026-004521",
sub:"VPN / Connection failure · raised 12 minutes ago",
status:"AI processing",
info:"First response due in 48 min"
},


{
p:"P3",
title:"VPN disconnects every few minutes",
id:"IT-2026-004488",
sub:"VPN / Connection failure · raised 2 days ago",
status:"In progress",
info:"Assigned to Network Team"
},


{
p:"P4",
title:"Request: Adobe Acrobat Pro licence",
id:"IT-2026-004401",
sub:"Software / Licensing · raised 5 days ago",
status:"Waiting on you",
info:"Manager approval needed"
},


{
p:"P4",
title:"Printer on 3rd floor not responding",
id:"IT-2026-004302",
sub:"Printer / Not printing · resolved 8 days ago",
status:"Resolved",
info:"Closed automatically"
}

];



export default function PortalTicketsPage(){


const navigate=useNavigate();


return(

<div className="max-w-[850px] mx-auto">


<div className="flex justify-between mb-6">


<div>

<h1 className="text-xl font-bold">

My tickets

</h1>


<p className="text-gray-500">

3 open · 12 resolved in the last 30 days

</p>


</div>



<button

onClick={()=>navigate("/portal/tickets/new")}

className="
bg-[#14532d]
text-white
px-5 py-3
rounded-lg
">

+ Raise a ticket

</button>


</div>





<div className="space-y-4">


{

tickets.map((t,i)=>(


<div

key={i}

className="
bg-white
border
border-[#dfe5e1]
rounded-xl
p-5
flex
justify-between
"


>


<div>


<span className="
bg-[#b45309]
text-white
px-3 py-1
rounded
text-xs
">

{t.p}

</span>


<h2 className="font-semibold mt-3">

{t.title}

</h2>


<p className="text-sm text-gray-500">

{t.id} · {t.sub}

</p>


</div>




<div className="text-right">


<span className="
bg-green-100
text-green-700
px-3 py-1
rounded
text-xs
">

{t.status}

</span>


<p className="text-sm text-gray-500 mt-3">

{t.info}

</p>


</div>



</div>


))

}


</div>


</div>

);


}
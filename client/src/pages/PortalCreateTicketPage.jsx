import { useState } from "react";
import { useNavigate } from "react-router-dom";


const PortalCreateTicketPage = () => {


const navigate = useNavigate();


const [form,setForm]=useState({

subject:"VPN connection failing on corporate network",

description:
'Unable to connect to VPN since this morning. Error message: "Connection timed out. Please check your network settings and try again." Tried restarting the client but issue persists.',

category:"VPN",

system:"Cisco AnyConnect",

start:"Today",

affected:"My team",

blocked:"Yes, completely",

urgency:"High",

workaround:false,

department:"IT",

location:"Chennai — DLF IT Park",

contact:"Email"

});





const update=(e)=>{

setForm({

...form,

[e.target.name]:e.target.value

});

};





return (


<div className="
grid
grid-cols-1
xl:grid-cols-[1fr_280px]
gap-6
">


{/* LEFT SIDE FORM */}


<div className="space-y-5">





{/* Duplicate Warning */}


<div className="
bg-[#fffbeb]
border
border-[#fde68a]
border-l-4
border-l-[#b45309]
rounded-xl
p-5
">


<h2 className="font-semibold text-[#92400e]">

⚠ You have a similar open ticket

</h2>


<p className="text-sm text-gray-600 mt-2">

Adding to an existing ticket is usually faster than raising a new one.

</p>



<div className="
mt-4
bg-white
rounded-lg
border
p-4
flex
justify-between
items-center
">


<div>

<p className="font-semibold">

VPN disconnects every few minutes

</p>


<p className="text-sm text-gray-500">

IT-2026-004488 · In progress · raised 2 days ago

</p>


</div>


<button className="
text-[#14532d]
font-semibold
">

Add to this →

</button>


</div>


</div>








{/* STEP 1 */}


<section className="
bg-white
rounded-xl
border
border-[#dfe5e1]
p-6
">


<div className="flex gap-3 items-center mb-5">


<div className="
bg-[#15803d]
text-white
rounded-full
h-8 w-8
flex
items-center
justify-center
font-bold
">

1

</div>


<div>

<h2 className="font-bold">

The issue

</h2>

<p className="text-sm text-gray-500">

Tell us what's happening

</p>


</div>


</div>





<label className="text-sm font-medium">

Subject *

</label>


<input

name="subject"

value={form.subject}

onChange={update}

className="
w-full
mt-2
border
rounded-lg
p-3
"
/>


<p className="text-xs text-gray-500 mt-1">

A clear one-line summary. "Help" or "Urgent" will be rejected.

</p>





<label className="text-sm font-medium block mt-5">

Description *

</label>


<textarea

name="description"

value={form.description}

onChange={update}

rows="5"

className="
w-full
mt-2
border
rounded-lg
p-3
"

/>


<p className="text-xs text-gray-500">

Include: error message · what you tried · when it started

</p>







<div className="
grid
md:grid-cols-2
gap-4
mt-5
">


<div>

<label className="text-sm">

Category

</label>


<select

name="category"

value={form.category}

onChange={update}

className="w-full border rounded-lg p-3 mt-2"

>


<option>Not sure — let AI decide</option>

<option>Network</option>

<option>VPN</option>

<option>Access</option>


</select>


</div>




<div>


<label className="text-sm">

Affected system

</label>


<input

name="system"

value={form.system}

onChange={update}

className="w-full border rounded-lg p-3 mt-2"

/>


</div>


</div>





<div className="mt-4">


<label className="text-sm">

When did it start?

</label>


<select className="
w-full
border
rounded-lg
p-3
mt-2
">


<option>Today</option>

<option>Just now</option>

<option>This week</option>

<option>Recurring</option>


</select>


</div>



</section>








{/* STEP 2 */}



<section className="
bg-white
rounded-xl
border
p-6
">


<div className="flex gap-3 items-center mb-5">


<div className="
bg-[#15803d]
text-white
rounded-full
h-8 w-8
flex
items-center
justify-center
font-bold
">

2

</div>


<div>

<h2 className="font-bold">

Impact

</h2>


<p className="text-sm text-gray-500">

Two questions that set the priority

</p>


</div>


</div>





<label className="text-sm">

Who is affected?

</label>


<div className="flex flex-wrap gap-2 mt-3">


{
["Just me","My team","My department","Whole org"]

.map(x=>(


<button

key={x}

className={`

px-4 py-2 rounded-lg border

${x==="My team"

?"bg-[#14532d] text-white"

:"bg-white"}

`}

>

{x}

</button>


))

}


</div>





<label className="text-sm block mt-5">

Is your work blocked?

</label>



<div className="flex gap-2 mt-3">


{

["Yes, completely","Partially","No"]

.map(x=>(


<button

key={x}

className={`px-4 py-2 rounded-lg border

${x==="Yes, completely"

?"bg-[#14532d] text-white"

:""}

`}

>

{x}

</button>


))

}


</div>



</section>








{/* STEP 3 */}


<section className="
bg-white
rounded-xl
border
p-6
">


<div className="flex gap-3">


<div className="
bg-[#14532d]
text-white
rounded-full
h-8 w-8
flex
items-center
justify-center
">

3

</div>


<div>

<h2 className="font-bold">

Context

</h2>


<p className="text-sm text-gray-500">

Mostly filled from your profile

</p>

</div>


</div>




<div className="grid md:grid-cols-2 gap-4 mt-5">


<select className="border rounded-lg p-3">

<option>IT</option>

<option>Finance</option>

<option>Operations</option>

</select>



<select className="border rounded-lg p-3">

<option>

Chennai — DLF IT Park

</option>

<option>

Bengaluru

</option>

</select>


<input

placeholder="LT-04821"

className="border rounded-lg p-3"

/>


<input

placeholder="Email"

className="border rounded-lg p-3"

/>



</div>



<p className="text-sm mt-4">

Attachments (. Max 5 files, 10 MB each)

</p>


<input

type="file"

className="mt-2"

/>



</section>






<div className="flex gap-3">


<button

className="
flex-1
bg-[#14532d]
text-white
rounded-lg
py-3
font-semibold
"

onClick={()=>navigate("/portal/tickets")}

>

➤ Submit ticket

</button>



<button

className="
border
rounded-lg
px-6
"

>

Save draft

</button>


</div>



</div>









{/* AI PANEL */}



<aside className="
bg-[#0f2b1d]
rounded-xl
p-5
text-white
h-fit
sticky
top-6
">


<p className="
text-xs
text-gray-400
uppercase
">

AI Classification Preview

</p>



<div className="mt-3 flex gap-2 items-center">

<span className="
h-3
w-3
rounded-full
bg-green-400
animate-pulse
">

</span>


<span className="text-sm">

Updating as you type

</span>


</div>





<div className="mt-6 space-y-4">


<div>

<p className="text-gray-400 text-sm">

Category

</p>

<p>

VPN

</p>

</div>


<div>

<p className="text-gray-400 text-sm">

Sub-category

</p>


<p>

Connection failure

</p>

</div>




<hr className="border-gray-700"/>



<div>

<p className="text-gray-400 text-sm">

Severity

</p>

<p>

HIGH

</p>

</div>




<div>

<p className="text-gray-400 text-sm">

Priority

</p>


<p className="text-red-300 font-bold">

P2

</p>


</div>



<div>

<p className="text-gray-400 text-sm">

Est. first response

</p>


<p>

1 hour

</p>


</div>




<hr className="border-gray-700"/>



<div>

<div className="flex justify-between text-sm">

<span>

Confidence

</span>


<span>

92%

</span>


</div>


<div className="
h-2
bg-gray-700
rounded-full
mt-2
">


<div className="
h-2
w-[92%]
bg-green-400
rounded-full
">

</div>


</div>


</div>




<div className="
text-xs
bg-green-900
inline-block
px-3
py-1
rounded
">

PATH: FAST · 47ms

</div>



<p className="
text-xs
text-gray-300
mt-4
leading-5
">


This is a preview only. Final classification runs after you submit and may differ. Priority is computed from impact, not from how urgent it feels.


</p>



</div>



</aside>



</div>


);


};


export default PortalCreateTicketPage;
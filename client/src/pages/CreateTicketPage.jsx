import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTicket } from "../services/ticketService";


const CreateTicketPage = () => {


const navigate = useNavigate();



const [form,setForm]=useState({

title:"",

category:"General",

priority:"Medium",

description:""

});



const [message,setMessage]=useState("");




const handleChange=(e)=>{


setForm({

...form,

[e.target.name]:e.target.value

});


};





const handleSubmit=async(e)=>{


e.preventDefault();



if(
!form.title ||
!form.description
){

setMessage(
"Please fill all required fields"
);


return;

}




await createTicket(form);



setMessage(
"Ticket created successfully"
);



setTimeout(()=>{


navigate("/customer/my-tickets");


},1000);



};






return (

<div className="
max-w-3xl
mx-auto
">


<div className="
bg-white
rounded-3xl
shadow-xl
border
border-purple-100
p-8
">


<h1 className="
text-3xl
font-bold
text-purple-700
">

Raise a Ticket

</h1>


<p className="
text-gray-500
mt-2
">

Create a support request. Our AI will analyse and prioritize it.

</p>





<form

onSubmit={handleSubmit}

className="
mt-8
space-y-5
"


>



<div>

<label className="font-medium">

Ticket Title *

</label>


<input

name="title"

value={form.title}

onChange={handleChange}

placeholder="Example: VPN not connecting"

className="
mt-2
w-full
rounded-xl
border
p-3
outline-none
focus:ring-2
focus:ring-purple-400
"

/>

</div>





<div>

<label className="font-medium">

Category

</label>


<select

name="category"

value={form.category}

onChange={handleChange}

className="
mt-2
w-full
rounded-xl
border
p-3
"

>


<option>
General
</option>

<option>
Technical
</option>

<option>
Billing
</option>

<option>
Account
</option>

<option>
VPN
</option>


</select>


</div>






<div>

<label className="font-medium">

Priority

</label>


<select

name="priority"

value={form.priority}

onChange={handleChange}

className="
mt-2
w-full
rounded-xl
border
p-3
"

>


<option>
Low
</option>


<option>
Medium
</option>


<option>
High
</option>


</select>


</div>





<div>


<label className="font-medium">

Description *

</label>



<textarea

name="description"

value={form.description}

onChange={handleChange}

rows="6"

placeholder="Explain your problem..."

className="
mt-2
w-full
rounded-xl
border
p-3
"

>


</textarea>


</div>







<div>


<label className="font-medium">

Attachment

</label>


<input

type="file"

className="
mt-2
block
"


/>


</div>







<button

className="
w-full
rounded-xl
py-3
text-white
font-semibold
bg-gradient-to-r
from-purple-600
to-pink-500
hover:scale-[1.02]
transition
"

>


Submit Ticket


</button>




{

message &&

<p className="
text-green-600
font-semibold
">

{message}

</p>


}



</form>


</div>


</div>

);


};


export default CreateTicketPage;
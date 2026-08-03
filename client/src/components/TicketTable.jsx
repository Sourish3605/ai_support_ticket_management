import { Link } from 'react-router-dom';


const TicketTable = ({ tickets, onEdit, onDelete }) => {


  const getPriorityStyle = (priority) => {

    switch(priority){

      case "High":
        return "bg-red-100 text-red-700";

      case "Medium":
        return "bg-yellow-100 text-yellow-700";

      case "Low":
        return "bg-green-100 text-green-700";

      default:
        return "bg-slate-100 text-slate-700";

    }

  };



  const getStatusStyle = (status) => {

    switch(status){

      case "Open":
        return "bg-red-50 text-red-600";


      case "In Progress":
        return "bg-blue-50 text-blue-600";


      case "Resolved":
        return "bg-green-50 text-green-600";


      case "Closed":
        return "bg-slate-100 text-slate-600";


      default:
        return "bg-slate-100 text-slate-600";

    }

  };




  return (

    <div className="
      overflow-hidden
      rounded-3xl
      border
      border-slate-200
      bg-white
      shadow-sm
      overflow-x-auto
    ">


      <table className="
        min-w-full
        divide-y
        divide-slate-200
        text-left
        text-sm
      ">


        <thead className="
          bg-slate-50
          text-slate-600
        ">


          <tr>


            <th className="px-4 py-3 font-semibold">
              Ticket ID
            </th>


            <th className="px-4 py-3 font-semibold">
              Category
            </th>


            <th className="px-4 py-3 font-semibold">
              Priority
            </th>


            <th className="px-4 py-3 font-semibold">
              SLA
            </th>


            <th className="px-4 py-3 font-semibold">
              Status
            </th>


            <th className="px-4 py-3 font-semibold">
              Assigned Agent
            </th>


            <th className="px-4 py-3 font-semibold">
              Action
            </th>


          </tr>


        </thead>





        <tbody className="
          divide-y
          divide-slate-100
          text-slate-700
        ">


          {
            tickets.map((ticket)=>(


              <tr

                key={ticket.id}

                className="
                  hover:bg-slate-50
                "

              >



                <td className="
                  px-4
                  py-3
                  font-semibold
                  text-indigo-600
                ">


                  {ticket.id}


                </td>





                <td className="px-4 py-3">


                  <span className="
                    rounded-full
                    bg-indigo-50
                    px-3
                    py-1
                    text-indigo-600
                  ">

                    {ticket.category}

                  </span>


                </td>






                <td className="px-4 py-3">


                  <span className={`
                    rounded-full
                    px-3
                    py-1
                    font-medium
                    ${getPriorityStyle(ticket.priority)}
                  `}>


                    {ticket.priority}


                  </span>


                </td>






                <td className="px-4 py-3">


                  <span className="
                    font-medium
                    text-slate-700
                  ">


                    {ticket.sla || "02:00:00"}


                  </span>


                </td>







                <td className="px-4 py-3">


                  <span className={`
                    rounded-full
                    px-3
                    py-1
                    font-medium
                    ${getStatusStyle(ticket.status)}
                  `}>


                    {ticket.status}


                  </span>


                </td>







                <td className="px-4 py-3">


                  {ticket.assignedTo}


                </td>







                <td className="px-4 py-3">


                  <div className="
                    flex
                    gap-2
                  ">



                    <Link

                      to={`/tickets/${ticket.id}`}

                      className="
                        rounded-full
                        bg-indigo-50
                        px-3
                        py-1
                        text-indigo-600
                      "

                    >

                      View

                    </Link>





                    <button

                      onClick={() =>
                        onEdit(ticket)
                      }

                      className="
                        rounded-full
                        bg-amber-100
                        px-3
                        py-1
                        text-amber-700
                      "

                    >

                      Edit

                    </button>





                    <button

                      onClick={() =>
                        onDelete(ticket.id)
                      }

                      className="
                        rounded-full
                        bg-rose-100
                        px-3
                        py-1
                        text-rose-700
                      "

                    >

                      Delete

                    </button>




                  </div>


                </td>





              </tr>


            ))
          }


        </tbody>


      </table>


    </div>


  );


};


export default TicketTable;
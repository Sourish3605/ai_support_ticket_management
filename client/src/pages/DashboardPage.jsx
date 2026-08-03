import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiTag,
  FiCpu
} from 'react-icons/fi';

import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar
} from 'recharts';

import DashboardCard from '../components/DashboardCard';
import TicketTable from '../components/TicketTable';
import Loader from '../components/Loader';

import {
  getDashboardData,
  getTickets
} from '../services/ticketService';


const COLORS = [
  '#4f46e5',
  '#f59e0b',
  '#10b981',
  '#ef4444'
];


const DashboardPage = () => {

  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [tickets, setTickets] = useState([]);



  useEffect(() => {

    const loadDashboard = async () => {

      setLoading(true);

      const [
        dashboard,
        ticketList
      ] = await Promise.all([
        getDashboardData(),
        getTickets()
      ]);


      setDashboardData(dashboard);
      setTickets(ticketList);

      setLoading(false);

    };


    loadDashboard();

  }, []);




  const summaryCards = useMemo(() => {

    if (!dashboardData) return [];


    const highPriority =
      tickets.filter(
        ticket => ticket.priority === "High"
      ).length;



    const slaBreaches =
      tickets.filter(
        ticket => ticket.slaStatus === "Breached"
      ).length;



    return [

      {
        id:"total",
        label:"Total Tickets",
        value:dashboardData.stats[0].value,
        change:"+12%",
        icon:FiTag
      },


      {
        id:"high",
        label:"High Priority",
        value:highPriority,
        change:"AI Predicted",
        icon:FiAlertCircle
      },


      {
        id:"resolved",
        label:"Resolved",
        value:
          tickets.filter(
            t => t.status === "Resolved"
          ).length,
        change:"+18%",
        icon:FiCheckCircle
      },


      {
        id:"sla",
        label:"SLA Breach",
        value:slaBreaches,
        change:"Needs Attention",
        icon:FiClock
      }

    ];


  },[dashboardData,tickets]);





  if(loading){

    return (
      <Loader label="Loading AI dashboard insights"/>
    );

  }





  return (

    <div className="space-y-6">


      {/* Profile Header */}

      <div className="
        rounded-3xl
        border
        border-slate-200
        bg-white
        p-6
        shadow-sm
        flex
        justify-between
        items-center
      ">


        <div>

          <h2 className="
            text-2xl
            font-bold
            text-slate-900
          ">
            Welcome, Ava Carter
          </h2>


          <p className="text-slate-500">
            AI Support Agent Dashboard
          </p>


        </div>



        <div className="
          rounded-full
          bg-indigo-50
          p-3
          text-indigo-600
        ">

          <FiCpu size={24}/>

        </div>


      </div>





      {/* Summary Cards */}


      <div className="
        grid
        gap-4
        md:grid-cols-2
        xl:grid-cols-4
      ">


        {
          summaryCards.map(card=>(

            <DashboardCard

              key={card.id}

              label={card.label}

              value={card.value}

              change={card.change}

              icon={card.icon}

            />

          ))
        }


      </div>





      {/* Ticket Trend and Priority */}


      <div className="
        grid
        xl:grid-cols-2
        gap-6
      ">



        <div className="
          rounded-3xl
          border
          border-slate-200
          bg-white
          p-5
        ">


          <h3 className="
            text-lg
            font-semibold
          ">
            Ticket Trend
          </h3>


          <p className="text-sm text-slate-500">
            Monthly ticket growth
          </p>



          <div className="h-72 mt-4">


            <ResponsiveContainer
              width="100%"
              height="100%"
            >


              <LineChart
                data={
                  dashboardData.reports.monthly
                }
              >


                <CartesianGrid
                  strokeDasharray="3 3"
                />


                <XAxis dataKey="name"/>


                <YAxis/>


                <Tooltip/>


                <Line

                  type="monotone"

                  dataKey="tickets"

                  stroke="#4f46e5"

                  strokeWidth={3}

                />


              </LineChart>


            </ResponsiveContainer>


          </div>


        </div>







        <div className="
          rounded-3xl
          border
          border-slate-200
          bg-white
          p-5
        ">


          <h3 className="
            text-lg
            font-semibold
          ">
            Priority Analysis
          </h3>


          <p className="text-sm text-slate-500">
            AI predicted priority levels
          </p>




          <div className="h-72">


            <ResponsiveContainer
              width="100%"
              height="100%"
            >


              <PieChart>


                <Pie

                  data={
                    dashboardData.reports.priority
                  }

                  dataKey="value"

                  nameKey="name"

                  innerRadius={60}

                  outerRadius={90}

                >


                  {
                    dashboardData.reports.priority.map(
                      (item,index)=>(

                        <Cell

                          key={item.name}

                          fill={
                            COLORS[index]
                          }

                        />

                      )
                    )
                  }


                </Pie>


                <Tooltip/>


              </PieChart>


            </ResponsiveContainer>


          </div>


        </div>



      </div>







      {/* Category Analytics */}


      <div className="
        rounded-3xl
        border
        border-slate-200
        bg-white
        p-5
      ">


        <h3 className="
          text-lg
          font-semibold
        ">
          AI Ticket Category Analytics
        </h3>


        <p className="text-sm text-slate-500">
          NLP based ticket classification
        </p>



        <div className="h-72 mt-4">


          <ResponsiveContainer
            width="100%"
            height="100%"
          >


            <BarChart
              data={
                dashboardData.reports.departments
              }
            >


              <CartesianGrid
                strokeDasharray="3 3"
              />


              <XAxis
                dataKey="name"
              />


              <YAxis/>


              <Tooltip/>


              <Bar

                dataKey="value"

                fill="#4f46e5"

                radius={[8,8,0,0]}

              />


            </BarChart>


          </ResponsiveContainer>


        </div>


      </div>








      {/* Smart Agent Queue */}



      <div className="
        rounded-3xl
        border
        border-slate-200
        bg-white
        p-5
      ">



        <div className="
          flex
          justify-between
          mb-4
        ">


          <div>

            <h3 className="
              text-lg
              font-semibold
            ">
              Smart Agent Queue
            </h3>


            <p className="text-sm text-slate-500">
              Priority sorted tickets with SLA tracking
            </p>


          </div>


          <button

            onClick={() =>
              navigate('/all-tickets')
            }

            className="
              text-indigo-600
              font-semibold
            "

          >

            View All

          </button>


        </div>




        <TicketTable

          tickets={
            [...tickets]
            .sort((a,b)=>{

              const priority={
                High:1,
                Medium:2,
                Low:3
              };


              return priority[a.priority]
                -
                priority[b.priority];

            })
            .slice(0,5)
          }


          onEdit={()=>{}}

          onDelete={()=>{}}


        />


      </div>







      {/* AI Reply Performance */}



      <div className="
        rounded-3xl
        border
        border-slate-200
        bg-white
        p-5
      ">


        <h3 className="
          text-lg
          font-semibold
        ">
          AI Suggested Reply Performance
        </h3>


        <p className="text-sm text-slate-500 mb-5">
          NLP response recommendation metrics
        </p>




        <div className="
          grid
          md:grid-cols-3
          gap-4
        ">



          <div className="rounded-2xl bg-indigo-50 p-5">

            <p className="text-sm text-slate-600">
              Similarity Score
            </p>

            <p className="text-3xl font-bold text-indigo-600">
              92%
            </p>

          </div>




          <div className="rounded-2xl bg-emerald-50 p-5">

            <p className="text-sm text-slate-600">
              AI Suggestions Used
            </p>

            <p className="text-3xl font-bold text-emerald-600">
              86%
            </p>

          </div>





          <div className="rounded-2xl bg-amber-50 p-5">

            <p className="text-sm text-slate-600">
              AI Resolved Tickets
            </p>

            <p className="text-3xl font-bold text-amber-600">
              120
            </p>

          </div>



        </div>


      </div>



    </div>

  );


};



export default DashboardPage;
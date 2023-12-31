import { 
  DataGrid,
  GridToolbarColumnsButton, 
  GridToolbarContainer,
  GridToolbarExport,
  GridToolbarFilterButton 
} from '@mui/x-data-grid';

import {
  Grid,
  List,
  ListItem,
  Checkbox,
  Accordion,
  AccordionSummary,
  Typography, 
  AccordionDetails
} from '@mui/material';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Data, Event, EventData, EEListItem, EListItem, EventItem } from './interfaces';
import { v4 as uuid } from 'uuid';
import './App.css';

const location = `${window.location.host.split(':')[0]}:3000`;
const getData = async () => {
  const res = await fetch(`http://${location}/skServer/eventsRoutingData`);
  return await res.json();
}

const CustomToolbar = () => {
  return (
    <GridToolbarContainer>
      <GridToolbarColumnsButton />
      <GridToolbarFilterButton />
      <GridToolbarExport />
    </GridToolbarContainer>
  );
}


function App() {
  
  const [data] = useState(Array<Event>());
  const [events, setEvents] = useState(Array<EEListItem> ());
  const [emitters, setEmitters] = useState(Array<EListItem> ());
  const [eventItems, setEventItems] = useState(Array<EventItem> ());
  const socketConnection = useRef<WebSocket | null>(null);

  const columnHeader = [
    { field: 'identifier', headerName: 'ID', description:'PGN/Sentence Unique Identifier', width: 80 },
    { field: 'event', headerName: 'Event', description:'Associated emitter event', width: 150 },
    { field: 'data', headerName: 'Data', description:'NMEA 0183 string, or NMEA 2000 JSON', width: 650 },
  ];

  const updateEventsChecked = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = event.target;
    setEvents((prev: Array<EEListItem>) => {
      return prev.map((item: EEListItem) => {
        return item.value === value ? { ...item, checked } : item
      })  
    })
  };

  const updateEmittersChecked = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = event.target;
    setEmitters((prev: Array<EListItem>) => {
      return prev.map((item: EListItem) => {
        return item.value === value ? { ...item, checked } : item
      })
    });
  }

  const onMessageEvent = (message: MessageEvent) => {
    const eventData: EventData = JSON.parse(message.data);
    //console.log(eventData)
    let id: string = ''
    if(typeof eventData.data === 'object'){
      id = eventData.data.pgn
      //TODO: delete pgn key from object
    } else if(typeof eventData.data === 'string'){
      //parse sentence for identifier
      //This may need updating for other sentence types
      id = eventData.data.split(',')[0].slice(1,6);
    }
    //console.log(id)
    setEventItems((prev: Array<EventItem>) => {
      const hasItem = prev.filter((item: EventItem) => item.identifier === id);
      //there could be an empty event
      if(hasItem.length === 0 && id !== ''){
        const newItem: EventItem = {
          identifier: id,
          id: uuid(),
          event: eventData.event,
          data: JSON.stringify(eventData.data)
        }
        return [...prev, newItem]
      } else{
        return prev.map((item: EventItem) => { 
          if(item.identifier === id){
           
            return {
              ...item,
              data: JSON.stringify(eventData.data)
            }
          } else {
            return item
          }
        })
      }
    })
  }

  const updateSocketEvents = useCallback(() => {
    const checkedVisibleEvents = events.filter((event: EEListItem) => event.checked === true && event.visible === true)
    const eventList = checkedVisibleEvents.map(event => event.value).join(',');
    const socketAddress = `ws:${location}/signalk/v1/stream?events=${eventList}&subscribe=none`;
    if(checkedVisibleEvents.length > 0){
      socketConnection.current?.close();
      const socket = new WebSocket(socketAddress);
      // socket.onopen = () => {
      //   console.log(`Websocket Connection Established: ${socketAddress}`);
      // };
      // socket.onclose = () => {
      //   console.log(`Websocket Connection Closed: ${socketAddress}`);
      // }
      socket.onmessage = onMessageEvent;
      socketConnection.current = socket;
    } else {
      socketConnection.current?.close();
    }
  }, [events])
  
  useEffect(() => {
    getData()
      .then((eventData: Data) => {
        let eventList: Array<EEListItem> = []
        let emittersList: Array<EListItem> = []
        eventData.events.forEach((event: Event) => {
          const hasEventListItem = eventList.filter((e: EEListItem) => e.value === event.event);
          const boundEmitters = Object.keys(event.emitters).filter(key=> key !== 'NO_EMITTER_ID')
          //add event to eventsList
          if(hasEventListItem.length === 0 && boundEmitters.length > 0){
            eventList.push({
              id: uuid(),
              value: event.event,
              emitters: boundEmitters,
              checked: false,
              visible: false
            })
          }
          //add emitters to emittersList
          Object.keys(event.emitters).forEach((emitter: string) => {
            const hasEmitterListItem = emittersList.filter((e: EListItem) => e.value === emitter);
            if(hasEmitterListItem.length === 0 && emitter !== 'NO_EMITTER_ID'){
              emittersList.push({
                id: uuid(),
                value: emitter,
                checked: false
              })
            }
          })
        });
        setEmitters([...emittersList]);
        setEvents([ ...eventList]);
      }).catch((err) => {    
        throw err;
      })
  }, [data]);


  useEffect(() => {
    setEventItems((prev: Array<EventItem>) => {
      return prev.filter((item: EventItem) => {
        return events.filter((event: EEListItem) => event.value === item.event && event.checked === true && event.visible === true).length > 0;
      })
    })
    updateSocketEvents()
  }, [events, updateSocketEvents]);



  useEffect(() => {
    const checkedEmitters = emitters.filter((emitter: EListItem) => emitter.checked === true)
    setEvents((prev: Array<EEListItem>) => {
        return prev.map((event: EEListItem) => {
          const eventHasEmitter = checkedEmitters.filter((emitter: EListItem) => {
            return event.emitters.includes(emitter.value)
          })
          if(eventHasEmitter.length > 0 && checkedEmitters.length > 0){
            return {
              ...event,
              visible: true
            } 
          } else {
            return {
              ...event,
              visible: false,
              //reset checked if not visible
              checked: false
            } 
          }
        })
    })
  }, [emitters]);
  
  return (
    <div className="App" style={{marginTop: 10}}>
      <Grid container spacing={2} mt={5} pl={0}>
        <Grid xs={3} item p={0}  style={{overflow:'scroll', height: 650}} mt={5}>
        <Accordion defaultExpanded={true} disableGutters style={{boxShadow:'none'}}>
            <AccordionSummary sx={{pt:0, mt:0, mb:0, pb:0}}
              expandIcon={<ExpandMoreIcon />}
              aria-controls="panel1a-content"
              aria-expanded={true}
              id="emitters">
                <Typography variant="body1">Emitters ({emitters.length})</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{pt:0, mt:0,  mb:0, pb:0}}>
              <List sx={{pt:0, mt:0}}>
                { emitters.map((emitter: EListItem) => 
                  <ListItem  sx={{p:.2}} key={emitter.id}>
                    <Checkbox 
                      sx={{p:0, mr:.08}} 
                      checked={emitter.checked} 
                      onChange={updateEmittersChecked} 
                      size="small" value={emitter.value}/> 
                      <label style={{marginLeft:8}}>{emitter.value}</label>
                  </ListItem>)}
              </List>
            </AccordionDetails>
          </Accordion>
         
          <Accordion defaultExpanded={true} style={{boxShadow:'none'}}>
            <AccordionSummary  sx={{pt:0, mt:0, mb:0, pb:0}}
              expandIcon={<ExpandMoreIcon />}
              aria-controls="panel1a-content"
              aria-expanded={true}
              id="events">
                <Typography variant="body1">Events ({events.filter(item=>item.visible).length})</Typography>
            </AccordionSummary>
            <AccordionDetails  sx={{pt:0, mt:0, mb:0, pb:0}}>
              <List sx={{pt:0, mt:0}}>
                { events
                  .filter((event: EEListItem) => event.visible)
                  .map((event: EEListItem) => 
                    <ListItem  sx={{p:0}} key={event.id}>
                      <Checkbox 
                        sx={{p:0, mr:.08}} 
                        checked={event.checked} 
                        onChange={updateEventsChecked} 
                        size="small" 
                        value={event.value}/> 
                        <label style={{marginLeft:8}}>{event.value}</label>
                    </ListItem>)}
              </List>
            </AccordionDetails>
          </Accordion>
        </Grid>
        <Grid xs={8} item style={{ height: 700, width: '100%', marginTop: 16 }}>
        <DataGrid
          slots={{ toolbar: CustomToolbar }}
          hideFooter={true} 
          slotProps={{
            toolbar: {
              showQuickFilter: true,
            },
          }}
          rows={eventItems}
          density='compact'
          columns={columnHeader} />
          <Typography variant='body2' style={{float:'right', paddingTop:4}}>Total Rows: {eventItems.length}</Typography>
        </Grid>
      </Grid>
    </div>
  );
}

export default App;

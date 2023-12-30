export interface Data {
  events: Array<Event>
}

export interface Event { 
  listeners: Object,
  emitters: Object,
  event: string
}

export interface EListItem {
  id: string,
  value: string,
  checked?: boolean
  visible?: boolean
}

export interface EEListItem extends EListItem {
  emitters: Array<string> 
}

export interface EventItem {
  event: string,
  data: string,
  id: string,
  identifier: string
}

export interface PGN {
  pgn: string,
}

export interface EventData {
  event: string,
  data: PGN | string
}
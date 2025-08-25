export interface MetaLeadField {
    name: string;
    values: string[];
  }
  
  export interface MetaLead {
    id: string;
    field_data: MetaLeadField[];
    created_time?: string;
  }
  
  export interface CreateLeadData {
    id: string;
    form_id: string;
    field_data: MetaLeadField[];
  }
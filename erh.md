```mermaid
graph TD
    %% Input/Storage/Process Shapes
    Input_Data[/Source Datasets: Roboflow Public Repos<br/>BankSecurity, Ski-mask, Face-side-view, etc./]
    Storage[(Edge Impulse Cloud: Dataset Management)]
    Process_Def[Define Class: Balaclavas & Helmets ONLY<br/>Exclude Surgical/Medical Masks]
    Process_Balance[Balance Dataset: 4,918 items<br/>0.80 Train / 0.20 Test]
    Process_Diversity[Ensure Demographic Diversity<br/>Include Darker Skin Tones]
    Process_Filter[Feature Subtraction:<br/>Add Hand/Arm & Ceiling/Wall Data]
    Decision{Confidence Threshold > 0.70?}
    Process_Train[Edge Impulse: DSP & Neural Network Training]
    Output_Export[TensorFlow Lite Export & C++ Library]
    
    %% Connections
    Input_Data --> Storage
    Storage --> Process_Def
    Process_Def --> Process_Balance
    Process_Balance --> Process_Diversity
    Process_Diversity --> Process_Filter
    Process_Filter --> Process_Train
    Process_Train --> Decision
    Decision -- Yes --> Output_Export
    Decision -- No --> Process_Filter
    
    %% Styling
    classDef input fill:#f9f,stroke:#333,stroke-width:2px;
    classDef storage fill:#ff9,stroke:#333,stroke-width:2px;
    classDef process fill:#e1f5fe,stroke:#333,stroke-width:2px;
    classDef decision fill:#fff9c4,stroke:#333,stroke-width:2px;
    
    class Input_Data input;
    class Storage storage;
    class Process_Def,Process_Balance,Process_Diversity,Process_Filter,Process_Train,Output_Export process;
    class Decision decision;
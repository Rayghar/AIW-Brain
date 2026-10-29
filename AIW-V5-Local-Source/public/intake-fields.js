// The workbook mapping form and import parser share these field identities,
// labels and header aliases. No parser, project state or UI dependencies.
export const INTAKE_FIELDS={
 externalId:{label:'External requirement ID',required:true,aliases:['baselineid','requirementid','externalid','id']},
 description:{label:'Requirement statement',required:true,aliases:['requirementstatement','requirement','description','statement']},
 domain:{label:'Domain',aliases:['domain']},capability:{label:'Capability theme',aliases:['capabilitytheme','capability','theme']},module:{label:'Module or sub-theme',aliases:['moduletheme','module','subtheme','submodule']},userGroup:{label:'User group',aliases:['usergroup','usergroups','userrole','persona']},
 owner:{label:'Accountable owner',aliases:['owner','accountableowner']},acceptance:{label:'Acceptance criterion',aliases:['acceptance','acceptancecriteria']},
 category:{label:'Promise / change category',aliases:['assessmentcategory','category']},delivery:{label:'Delivery assertion',aliases:['deliverystatus']},validation:{label:'Validation assertion',aliases:['functionalvalidation','validationstatus']},reliability:{label:'Reliability assertion',aliases:['reliabilitystatus']},manual:{label:'Manual intervention',aliases:['manualintervention']},
 evidence:{label:'Evidence reference',aliases:['evidencereference']},comments:{label:'Source comments',aliases:['ownercomments','comments']},date:{label:'Assessment date',aliases:['validationdate','assessmentdate']},
 uatCount:{label:'Historical test count',aliases:['uattestcount']},uatPass:{label:'Historical passed',aliases:['uatpass']},uatFail:{label:'Historical failed',aliases:['uatfail']},uatBlocked:{label:'Historical blocked',aliases:['uatblocked']},
 userNeed:{label:'User need',aliases:['userneed']},outcome:{label:'Intended outcome',aliases:['intendedoutcome']},priorityScore:{label:'Source priority score',aliases:['v2priorityscore','priorityscore']},priorityBand:{label:'Source priority band',aliases:['v2priorityband','priorityband']},
 pglLinked:{label:'Post-go-live link',aliases:['pgllinked','pgllink','postgolivelinked']},sourceBasis:{label:'Source basis',aliases:['sourcebasis','basis']},mappingMethod:{label:'Mapping method',aliases:['mappingmethod']},sourceReference:{label:'Source reference',aliases:['sourcereference','sourceref']},sourceAuthority:{label:'Source authority',aliases:['sourceauthority','authority']}
};
